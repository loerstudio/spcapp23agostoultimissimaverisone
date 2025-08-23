import supabase from './supabase-client.js';

const clientListContainer = document.getElementById('client-list');
const addClientForm = document.getElementById('add-client-form');
const addClientMessage = document.getElementById('add-client-message');

// Function to fetch and display clients using the new database function
const fetchAndDisplayClients = async () => {
    clientListContainer.innerHTML = '<p>Loading clients...</p>';
    try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) {
            window.location.href = 'signin.html';
            return;
        }

        const trainerId = user.id;

        // Call the RPC function to get client details
        const { data: clients, error: rpcError } = await supabase.rpc('get_clients_with_details', {
            trainer_id_param: trainerId
        });

        if (rpcError) throw rpcError;

        displayClients(clients, trainerId);

    } catch (error) {
        console.error('Error fetching clients:', error);
        clientListContainer.innerHTML = `<p class="text-red-500">Error loading clients: ${error.message}</p>`;
    }
};

// Function to display clients in the UI
const displayClients = (clients, trainerId) => {
    clientListContainer.innerHTML = ''; // Clear current list

    if (!clients || clients.length === 0) {
        clientListContainer.innerHTML = '<p>You have no clients yet.</p>';
        return;
    }

    clients.forEach(client => {
        const clientElement = document.createElement('div');
        clientElement.className = 'flex items-center justify-between p-4 bg-gray-50 rounded-lg';
        clientElement.innerHTML = `
            <div>
                <p class="font-bold">${client.full_name || 'N/A'}</p>
                <p class="text-sm text-gray-600">${client.email}</p>
            </div>
            <div class="flex space-x-2">
                <a href="client-progress.html?id=${client.id}" class="bg-purple-500 hover:bg-purple-600 text-white font-bold py-1 px-3 rounded text-sm">Progress</a>
                <button data-client-id="${client.id}" class="delete-client-btn bg-red-500 hover:bg-red-600 text-white font-bold py-1 px-3 rounded text-sm">Delete</button>
            </div>
        `;
        clientListContainer.appendChild(clientElement);
    });

    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-client-btn').forEach(button => {
        button.addEventListener('click', async (e) => {
            const clientId = e.target.getAttribute('data-client-id');
            if (confirm('Are you sure you want to delete this client?')) {
                await deleteClient(clientId, trainerId);
            }
        });
    });
};

// Event listener for adding a new client
addClientForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const clientEmail = document.getElementById('client-email').value;
    addClientMessage.textContent = '';
    addClientMessage.className = 'mt-4';

    try {
        const { data: { user: trainerUser }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const trainerId = trainerUser.id;

        // Call the RPC function to add the client
        const { error: rpcError } = await supabase.rpc('add_client_by_email', {
            trainer_id_param: trainerId,
            client_email_param: clientEmail
        });

        if (rpcError) throw rpcError;

        addClientMessage.textContent = 'Client added successfully!';
        addClientMessage.classList.add('text-green-500');
        addClientForm.reset();
        fetchAndDisplayClients(); // Refresh the list

    } catch (error) {
        addClientMessage.textContent = `Error: ${error.message}`;
        addClientMessage.classList.add('text-red-500');
    }
});

// Function to delete a client
const deleteClient = async (clientId, trainerId) => {
    try {
        const { error } = await supabase
            .from('clients')
            .delete()
            .eq('trainer_id', trainerId)
            .eq('client_id', clientId);

        if (error) throw error;

        fetchAndDisplayClients(); // Refresh list

    } catch (error) {
        console.error('Error deleting client:', error);
        alert(`Failed to delete client: ${error.message}`);
    }
};

// Initial fetch of clients when the page loads
document.addEventListener('DOMContentLoaded', () => {
    // A small delay to ensure supabase client is initialized
    setTimeout(fetchAndDisplayClients, 50);
});
