create or replace function save_meal_plan(
    p_plan_id bigint, -- null for new plans
    p_trainer_id uuid,
    p_name text,
    p_description text,
    p_client_id uuid,
    p_days jsonb -- [{ "day_name": "Day 1", "meals": [...] }, ...]
)
returns bigint as $$
declare
    new_plan_id bigint;
    new_day_id bigint;
    day_data jsonb;
    meal_data jsonb;
begin
    -- Upsert the main meal plan details
    if p_plan_id is not null then
        -- Update existing plan
        update public.meal_plans
        set
            name = p_name,
            description = p_description,
            client_id = p_client_id
        where
            id = p_plan_id and trainer_id = p_trainer_id
        returning id into new_plan_id;

        -- Clean up old days and foods for simplicity
        delete from public.meal_plan_days where meal_plan_id = new_plan_id;

    else
        -- Insert new plan
        insert into public.meal_plans (trainer_id, name, description, client_id)
        values (p_trainer_id, p_name, p_description, p_client_id)
        returning id into new_plan_id;
    end if;

    -- Loop through the days and insert them
    for day_data in select * from jsonb_array_elements(p_days)
    loop
        -- Insert the day
        insert into public.meal_plan_days (meal_plan_id, day_name)
        values (new_plan_id, day_data->>'day_name')
        returning id into new_day_id;

        -- Loop through the meals for that day
        for meal_data in select * from jsonb_array_elements(day_data->'meals')
        loop
            -- Insert the food item for the meal
            insert into public.meal_day_foods (meal_day_id, food_id, meal_type, quantity)
            values (
                new_day_id,
                (meal_data->>'food_id')::bigint,
                meal_data->>'meal_type',
                meal_data->>'quantity'
            );
        end loop;
    end loop;

    return new_plan_id;
end;
$$ language plpgsql security definer;
