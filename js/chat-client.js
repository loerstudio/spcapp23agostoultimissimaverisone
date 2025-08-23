import supabase from './supabase-client.js';

// DOM Elements
const chatHeader = document.getElementById('chat-header');
const chatWithName = document.getElementById('chat-with-name');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');

let currentClientId = null;
let trainerId = null;
let messageSubscription = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }
    currentClientId = user.id;

    await findTrainerAndLoadChat(currentClientId);

    messageForm.addEventListener('submit', sendMessage);
});


async function findTrainerAndLoadChat(clientId) {
    try {
        // 1. Find the trainer
        const { data: clientData, error: clientError } = await supabase
            .from('clients')
            .select('trainer_id')
            .eq('client_id', clientId)
            .single();

        if (clientError) {
            if (clientError.code === 'PGRST116') {
                messagesContainer.innerHTML = '<p class="text-center text-gray-500">You are not assigned to a trainer.</p>';
            } else {
                throw clientError;
            }
            return;
        }

        trainerId = clientData.trainer_id;

        // 2. Get trainer's name
        const { data: trainerProfile, error: profileError } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', trainerId)
            .single();
        if (profileError) throw profileError;

        chatWithName.textContent = `Chat with ${trainerProfile.full_name}`;

        // 3. Load chat
        await loadMessageHistory(trainerId);
        subscribeToNewMessages(trainerId);

    } catch (error) {
        console.error('Error loading chat:', error);
        messagesContainer.innerHTML = '<p class="text-red-500">Could not load chat.</p>';
    }
}


async function loadMessageHistory(trainerId) {
    try {
        const { data, error } = await supabase
            .from('messages')
            .select('*')
            .or(`(sender_id.eq.${currentClientId},receiver_id.eq.${trainerId}),(sender_id.eq.${trainerId},receiver_id.eq.${currentClientId})`)
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
    if (!content || !trainerId) return;

    try {
        const { error } = await supabase
            .from('messages')
            .insert({
                sender_id: currentClientId,
                receiver_id: trainerId,
                content: content
            });

        if (error) throw error;

        messageInput.value = '';
        renderMessage({ content, sender_id: currentClientId }, true);
        scrollToBottom();

    } catch (error) {
        console.error('Error sending message:', error);
    }
}

function subscribeToNewMessages(trainerId) {
    messageSubscription = supabase
        .channel(`messages-from-${trainerId}-to-${currentClientId}`)
        .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `receiver_id=eq.${currentClientId}`
        }, payload => {
            if (payload.new.sender_id === trainerId) {
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

    const isSender = message.sender_id === currentClientId;

    div.innerHTML = `
        <div class="p-3 rounded-lg max-w-lg ${isSender ? 'bg-green-500 text-white ml-auto' : 'bg-gray-300 text-black mr-auto'}">
            ${message.content}
        </div>
    `;
    messagesContainer.appendChild(div);
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}
