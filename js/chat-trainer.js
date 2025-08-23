import supabase from './supabase-client.js';

// DOM Elements
const clientListUl = document.getElementById('client-list');
const chatHeader = document.getElementById('chat-header');
const chatWithName = document.getElementById('chat-with-name');
const messagesContainer = document.getElementById('messages-container');
const messageFormContainer = document.getElementById('message-form-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

let currentTrainerId = null;
let selectedClientId = null;
let messageSubscription = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }
    currentTrainerId = user.id;

    await loadClientList();

    messageForm.addEventListener('submit', sendMessage);
});

// --- CLIENT LIST ---
async function loadClientList() {
    try {
        const { data: clients, error } = await supabase.rpc('get_clients_with_details', {
            trainer_id_param: currentTrainerId
        });
        if (error) throw error;

        clientListUl.innerHTML = '';
        clients.forEach(client => {
            const li = document.createElement('li');
            li.className = 'p-3 hover:bg-gray-200 cursor-pointer';
            li.textContent = client.full_name || client.email;
            li.setAttribute('data-client-id', client.id);
            li.setAttribute('data-client-name', client.full_name || client.email);
            clientListUl.appendChild(li);
        });

        // Add click listeners
        clientListUl.querySelectorAll('li').forEach(li => {
            li.addEventListener('click', handleClientSelection);
        });

    } catch (error) {
        console.error('Error loading client list:', error);
        clientListUl.innerHTML = '<li>Failed to load clients.</li>';
    }
}

// --- CHAT LOGIC ---
async function handleClientSelection(event) {
    // Unsubscribe from previous channel if it exists
    if (messageSubscription) {
        supabase.removeChannel(messageSubscription);
        messageSubscription = null;
    }

    selectedClientId = event.target.getAttribute('data-client-id');
    const clientName = event.target.getAttribute('data-client-name');

    // Update UI
    chatWithName.textContent = `Chat with ${clientName}`;
    messageFormContainer.classList.remove('hidden');
    messagesContainer.innerHTML = '<p>Loading messages...</p>';

    // Highlight selected client
    clientListUl.querySelectorAll('li').forEach(li => li.classList.remove('bg-blue-200'));
    event.target.classList.add('bg-blue-200');

    await loadMessageHistory(selectedClientId);
    subscribeToNewMessages(selectedClientId);
}

async function loadMessageHistory(clientId) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`(sender_id.eq.${currentTrainerId},receiver_id.eq.${clientId}),(sender_id.eq.${clientId},receiver_id.eq.${currentTrainerId})`)
            .order('created_at', { ascending: true });

        if (error) throw error;

        messagesContainer.innerHTML = '';
        data.forEach(renderMessage);
        scrollToBottom();

    } catch (error) {
        console.error('Error loading messages:', error);
        messagesContainer.innerHTML = '<p>Could not load message history.</p>';
    }
}

async function sendMessage(e) {
    e.preventDefault();
    const content = messageInput.value.trim();
    if (!content || !selectedClientId) return;

    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                sender_id: currentTrainerId,
                receiver_id: selectedClientId,
                content: content
            });

        if (error) throw error;

        messageInput.value = '';
        // The message will be rendered by the realtime subscription for the sender too
        // But we can also render it immediately for better UX
        renderMessage({ content, sender_id: currentTrainerId }, true);
        scrollToBottom();

    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function subscribeToNewMessages(clientId) {
    messageSubscription = supabase
        .channel(`messages-from-${clientId}-to-${currentTrainerId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${currentTrainerId}` // Only listen for messages sent TO me
        }, payload => {
            // Check if the message is from the currently selected client
            if (payload.new.sender_id === selectedClientId) {
                renderMessage(payload.new);
                scrollToBottom();
            }
        })
        .subscribe();
}


// --- UI HELPERS ---
function renderMessage(message, isOptimistic = false) {
    const div = document.createElement('div');
    div.className = 'mb-2';

    const isSender = message.sender_id === currentTrainerId;

    div.innerHTML = `
        <div class="p-3 rounded-lg max-w-lg ${isSender ? 'bg-blue-500 text-white ml-auto' : 'bg-gray-300 text-black mr-auto'}">
            ${message.content}
        </div>
    `;
    if (isOptimistic) {
        // You might want to add a visual indicator for optimistic messages
        // e.g., a small clock icon that you remove when the real message arrives
    }
    messagesContainer.appendChild(div);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
