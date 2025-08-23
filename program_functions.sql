create or replace function save_workout_program(
    p_program_id bigint, -- null for new programs
    p_trainer_id uuid,
    p_name text,
    p_description text,
    p_client_id uuid,
    p_days jsonb -- [{ "day_name": "Day 1", "exercises": [...] }, ...]
)
returns bigint as $$
declare
    new_program_id bigint;
    new_day_id bigint;
    day_data jsonb;
    exercise_data jsonb;
begin
    -- Upsert the main program details
    if p_program_id is not null then
        -- Update existing program
        update public.workout_programs
        set
            name = p_name,
            description = p_description,
            client_id = p_client_id
        where
            id = p_program_id and trainer_id = p_trainer_id
        returning id into new_program_id;

        -- Clean up old days and exercises for simplicity
        delete from public.workout_program_days where program_id = new_program_id;

    else
        -- Insert new program
        insert into public.workout_programs (trainer_id, name, description, client_id)
        values (p_trainer_id, p_name, p_description, p_client_id)
        returning id into new_program_id;
    end if;

    -- Loop through the days and insert them
    for day_data in select * from jsonb_array_elements(p_days)
    loop
        -- Insert the day
        insert into public.workout_program_days (program_id, day_name)
        values (new_program_id, day_data->>'day_name')
        returning id into new_day_id;

        -- Loop through the exercises for that day and insert them
        for exercise_data in select * from jsonb_array_elements(day_data->'exercises')
        loop
            insert into public.workout_day_exercises (workout_day_id, exercise_id, sets, reps, notes)
            values (
                new_day_id,
                (exercise_data->>'exercise_id')::bigint,
                (exercise_data->>'sets')::integer,
                exercise_data->>'reps',
                exercise_data->>'notes'
            );
        end loop;
    end loop;

    return new_program_id;
end;
$$ language plpgsql security definer;
