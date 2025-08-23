import supabase from './supabase-client.js';

// DOM Elements
const pageTitle = document.getElementById('page-title');
const goalInfoContainer = document.getElementById('goal-info');
const progressGalleryContainer = document.getElementById('progress-gallery');

let currentClientId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }

    const urlParams = new URLSearchParams(window.location.search);
    currentClientId = urlParams.get('id');

    if (!currentClientId) {
        document.body.innerHTML = '<p class="text-red-500 text-center p-8">No client ID provided.</p>';
        return;
    }

    await loadClientName(currentClientId);
    await loadGoalInfo(currentClientId);
});


async function loadClientName(clientId) {
    try {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', clientId)
            .single();

        if (error) throw error;

        if (profile) {
            pageTitle.textContent = `Progress for ${profile.full_name}`;
        }

    } catch (error) {
        console.error('Error fetching client name:', error);
    }
}

async function loadGoalInfo(clientId) {
    try {
        // Fetch the most recent goal for the client
        const { data: goal, error } = await supabase
            .from('goals')
            .select('*')
            .eq('client_id', clientId)
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') { // PostgREST error for "exact one row not found"
                goalInfoContainer.innerHTML = '<p>This client has not set a goal yet.</p>';
                progressGalleryContainer.innerHTML = '';
            } else {
                throw error;
            }
            return;
        }

        if (goal) {
            goalInfoContainer.innerHTML = `
                <h2 class="text-2xl font-bold mb-4">Current Goal</h2>
                <p><span class="font-bold">Description:</span> ${goal.description || 'No description.'}</p>
                <p><span class="font-bold">From:</span> ${new Date(goal.start_date).toLocaleDateString()}</p>
                <p><span class="font-bold">To:</span> ${new Date(goal.end_date).toLocaleDateString()}</p>
            `;
            await loadProgressPhotos(goal.id);
        }

    } catch (error) {
        console.error('Error fetching goal info:', error);
        goalInfoContainer.innerHTML = '<p class="text-red-500">Could not load goal information.</p>';
    }
}

async function loadProgressPhotos(goalId) {
    try {
        const { data: photos, error } = await supabase
            .from('progress_photos')
            .select('*')
            .eq('goal_id', goalId)
            .order('photo_date', { ascending: true });

        if (error) throw error;

        progressGalleryContainer.innerHTML = '';
        if (photos.length === 0) {
            progressGalleryContainer.innerHTML = '<p>No progress photos have been uploaded for this goal yet.</p>';
            return;
        }

        photos.forEach(photo => {
            const photoCard = document.createElement('div');
            photoCard.className = 'bg-white rounded-lg shadow-md';
            photoCard.innerHTML = `
                <img src="${photo.photo_url}" alt="Progress on ${new Date(photo.photo_date).toLocaleDateString()}" class="w-full h-48 object-cover rounded-t-lg">
                <div class="p-2 text-center">
                    <p class="font-bold">${new Date(photo.photo_date).toLocaleDateString()}</p>
                </div>
            `;
            progressGalleryContainer.appendChild(photoCard);
        });

    } catch (error) {
        console.error('Error fetching photos:', error);
        progressGalleryContainer.innerHTML = '<p class="text-red-500">Could not load photos.</p>';
    }
}
