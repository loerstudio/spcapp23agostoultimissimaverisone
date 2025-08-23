-- A function to get all clients for a given trainer with their details
create or replace function get_clients_with_details(trainer_id_param uuid)
returns table (
    id uuid,
    full_name text,
    email text
) as $$
begin
    return query
    select
        p.id,
        p.full_name,
        u.email
    from
        clients c
    join
        profiles p on c.client_id = p.id
    join
        auth.users u on c.client_id = u.id
    where
        c.trainer_id = trainer_id_param;
end;
$$ language plpgsql security definer;


-- A function to add a client to a trainer by email
create or replace function add_client_by_email(trainer_id_param uuid, client_email_param text)
returns void as $$
declare
    client_user_id uuid;
begin
    -- Find the user by email
    select id into client_user_id from auth.users where email = client_email_param;

    -- If user not found, raise an exception
    if not found then
        raise exception 'User with email % not found', client_email_param;
    end if;

    -- Prevent trainer from adding themselves
    if client_user_id = trainer_id_param then
        raise exception 'You cannot add yourself as a client.';
    end if;

    -- Insert the new client relationship
    insert into public.clients(trainer_id, client_id)
    values(trainer_id_param, client_user_id);

exception
    -- Catch unique constraint violation (client already exists)
    when unique_violation then
        raise exception 'This user is already your client.';
end;
$$ language plpgsql security definer;
