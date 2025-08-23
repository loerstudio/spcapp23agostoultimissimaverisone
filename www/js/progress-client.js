import supabase from './supabase-client.js';

// DOM Elements
const goalSection = document.getElementById('goal-section');
const goalDisplay = document.getElementById('goal-display');
const goalForm = document.getElementById('goal-form');
const photoUploadSection = document.getElementById('photo-upload-section');
const photoForm = document.getElementById('photo-form');
const uploadMessage = document.getElementById('upload-message');
const progressGallery = document.getElementById('progress-gallery');

let currentClientId = null;
let currentGoal = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }
    currentClientId = user.id;

    await loadPageData();

    goalForm.addEventListener('submit', saveGoal);
    photoForm.addEventListener('submit', uploadPhoto);
});


async function loadPageData() {
    try {
        const { data: goal, error } = await supabase
            .from('goals')
            .select('*')
            .eq('client_id', currentClientId)
            .order('start_date', { ascending: false })
            .limit(1)
            .single();

        if (error && error.code !== 'PGRST116') throw error;

        currentGoal = goal;

        if (currentGoal) {
            displayGoalInfo();
            goalForm.classList.add('hidden');
            photoUploadSection.classList.remove('hidden');
            await loadProgressPhotos(currentGoal.id);
        } else {
            goalDisplay.innerHTML = '<p>Non hai ancora impostato un obiettivo. Compila il modulo qui sotto per iniziare!</p>';
            goalForm.classList.remove('hidden');
            photoUploadSection.classList.add('hidden');
        }

    } catch (error) {
        console.error('Errore caricamento dati pagina:', error);
        goalSection.innerHTML = '<p class="text-red-500">Impossibile caricare le informazioni del tuo obiettivo.</p>';
    }
}

function displayGoalInfo() {
    goalDisplay.innerHTML = `
        <p><strong>Descrizione:</strong> ${currentGoal.description}</p>
        <p><strong>Data Inizio:</strong> ${new Date(currentGoal.start_date).toLocaleDateString()}</p>
        <p><strong>Data Fine:</strong> ${new Date(currentGoal.end_date).toLocaleDateString()}</p>
        <button id="edit-goal-btn" class="mt-2 bg-yellow-500 text-white py-1 px-3 rounded">Modifica Obiettivo</button>
    `;
    document.getElementById('edit-goal-btn').addEventListener('click', () => {
        goalDisplay.classList.add('hidden');
        document.getElementById('goal-description').value = currentGoal.description;
        document.getElementById('start-date').value = currentGoal.start_date;
        document.getElementById('end-date').value = currentGoal.end_date;
        goalForm.classList.remove('hidden');
    });
}

async function saveGoal(e) {
    e.preventDefault();
    const description = document.getElementById('goal-description').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    try {
        const goalData = {
            client_id: currentClientId,
            description: description,
            start_date: startDate,
            end_date: endDate,
        };

        if (currentGoal) {
            // Update
            const { error } = await supabase.from('goals').update(goalData).eq('id', currentGoal.id);
            if (error) throw error;
        } else {
            // Insert
            const { error } = await supabase.from('goals').insert(goalData);
            if (error) throw error;
        }

        alert('Obiettivo salvato con successo!');
        await loadPageData();

    } catch (error) {
        console.error('Errore salvataggio obiettivo:', error);
        alert('Impossibile salvare l\'obiettivo.');
    }
}

async function uploadPhoto(e) {
    e.preventDefault();
    uploadMessage.textContent = 'Caricamento...';
    uploadMessage.className = 'mt-4';
    const photoFile = document.getElementById('progress-photo').files[0];

    if (!photoFile) {
        uploadMessage.textContent = 'Per favore seleziona un file.';
        uploadMessage.classList.add('text-red-500');
        return;
    }

    try {
        const fileName = `${currentClientId}/${currentGoal.id}/${Date.now()}_${photoFile.name}`;
        const { error: uploadError } = await supabase.storage.from('progress_photos').upload(fileName, photoFile);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage.from('progress_photos').getPublicUrl(fileName);

        const photoRecord = {
            goal_id: currentGoal.id,
            photo_url: urlData.publicUrl,
            photo_date: new Date().toISOString().split('T')[0], // Today's date
        };

        const { error: dbError } = await supabase.from('progress_photos').insert(photoRecord);
        if (dbError) throw dbError;

        uploadMessage.textContent = 'Caricamento riuscito!';
        uploadMessage.classList.add('text-green-500');
        photoForm.reset();
        await loadProgressPhotos(currentGoal.id);

    } catch (error) {
        console.error('Errore caricamento foto:', error);
        uploadMessage.textContent = `Errore: ${error.message}`;
        uploadMessage.classList.add('text-red-500');
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

        progressGallery.innerHTML = '';
        if (photos.length === 0) {
            progressGallery.innerHTML = '<p>Nessuna foto di progresso caricata per questo obiettivo.</p>';
            return;
        }

        photos.forEach(photo => {
            const photoCard = document.createElement('div');
            photoCard.className = 'bg-white rounded-lg shadow-md';
            photoCard.innerHTML = `
                <img src="${photo.photo_url}" alt="Progresso del ${new Date(photo.photo_date).toLocaleDateString()}" class="w-full h-48 object-cover rounded-t-lg">
                <div class="p-2 text-center">
                    <p class="font-bold">${new Date(photo.photo_date).toLocaleDateString()}</p>
                </div>
            `;
            progressGallery.appendChild(photoCard);
        });

    } catch (error) {
        console.error('Errore caricamento foto:', error);
        progressGallery.innerHTML = '<p class="text-red-500">Impossibile caricare le foto.</p>';
    }
}
