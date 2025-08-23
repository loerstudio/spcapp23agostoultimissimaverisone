import supabase from './supabase-client.js';

// DOM Elements
const toggleFormBtn = document.getElementById('toggle-form-btn');
const exerciseFormContainer = document.getElementById('exercise-form-container');
const exerciseForm = document.getElementById('exercise-form');
const formTitle = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const exerciseListContainer = document.getElementById('exercise-list');
const photoInput = document.getElementById('exercise-photo');
const photoPreview = document.getElementById('photo-preview');
const formMessage = document.getElementById('form-message');
const exerciseIdInput = document.getElementById('exercise-id');

let currentTrainerId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }
    currentTrainerId = user.id;

    toggleFormBtn.addEventListener('click', () => {
        resetForm();
        exerciseFormContainer.classList.toggle('hidden');
    });

    cancelEditBtn.addEventListener('click', () => {
        resetForm();
        exerciseFormContainer.classList.add('hidden');
    });

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (file) {
            photoPreview.src = URL.createObjectURL(file);
            photoPreview.classList.remove('hidden');
        }
    });

    exerciseForm.addEventListener('submit', saveExercise);

    await fetchAndDisplayExercises();
});

// --- DATA FETCH AND DISPLAY ---
async function fetchAndDisplayExercises() {
    exerciseListContainer.innerHTML = '<p>Caricamento esercizi...</p>';
    try {
        const { data: exercises, error } = await supabase
            .from('exercises')
            .select('*')
            .eq('trainer_id', currentTrainerId)
            .order('name');

        if (error) throw error;

        displayExercises(exercises);

    } catch (error) {
        console.error('Errore nel caricamento degli esercizi:', error);
        exerciseListContainer.innerHTML = '<p class="text-red-500">Errore nel caricamento degli esercizi.</p>';
    }
}

function displayExercises(exercises) {
    exerciseListContainer.innerHTML = '';
    if (exercises.length === 0) {
        exerciseListContainer.innerHTML = '<p>La tua libreria di esercizi è vuota. Aggiungi un esercizio per iniziare!</p>';
        return;
    }

    exercises.forEach(exercise => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col';
        card.innerHTML = `
            <img src="${exercise.photo_url || 'https://via.placeholder.com/150'}" alt="${exercise.name}" class="w-full h-40 object-cover rounded-md mb-4">
            <h3 class="text-lg font-bold">${exercise.name}</h3>
            <p class="text-gray-600 flex-grow">${exercise.description.substring(0, 100)}...</p>
            <div class="mt-4 flex justify-end space-x-2">
                <button data-id="${exercise.id}" class="edit-btn bg-blue-500 text-white py-1 px-3 rounded">Modifica</button>
                <button data-id="${exercise.id}" data-photo="${exercise.photo_url || ''}" class="delete-btn bg-red-500 text-white py-1 px-3 rounded">Elimina</button>
            </div>
        `;
        exerciseListContainer.appendChild(card);
    });

    // Add event listeners
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const exerciseToEdit = exercises.find(ex => ex.id == id);
        populateFormForEdit(exerciseToEdit);
    }));

    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => {
        if (confirm('Sei sicuro di voler eliminare questo esercizio?')) {
            const id = e.target.getAttribute('data-id');
            const photoUrl = e.target.getAttribute('data-photo');
            deleteExercise(id, photoUrl);
        }
    }));
}

// --- FORM HANDLING ---
function populateFormForEdit(exercise) {
    resetForm();
    formTitle.textContent = 'Modifica Esercizio';
    exerciseIdInput.value = exercise.id;
    document.getElementById('exercise-name').value = exercise.name;
    document.getElementById('exercise-description').value = exercise.description;
    document.getElementById('exercise-video-url').value = exercise.video_url || '';
    if (exercise.photo_url) {
        photoPreview.src = exercise.photo_url;
        photoPreview.classList.remove('hidden');
    }
    exerciseFormContainer.classList.remove('hidden');
    window.scrollTo(0, 0); // Scroll to top to see the form
}

function resetForm() {
    exerciseForm.reset();
    exerciseIdInput.value = '';
    photoPreview.classList.add('hidden');
    photoPreview.src = '';
    formTitle.textContent = 'Aggiungi Nuovo Esercizio';
    formMessage.textContent = '';
    formMessage.className = 'mt-4';
}

// --- CRUD OPERATIONS ---
async function saveExercise(e) {
    e.preventDefault();
    const saveButton = e.target.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = 'Salvataggio...';
    formMessage.textContent = '';

    try {
        let photoUrl = photoPreview.src.startsWith('http') ? photoPreview.src : null;
        const file = photoInput.files[0];

        if (file) {
            const fileName = `${currentTrainerId}/${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await supabase
                .storage
                .from('exercise_photos')
                .upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage.from('exercise_photos').getPublicUrl(fileName);
            photoUrl = urlData.publicUrl;
        }

        const exerciseData = {
            trainer_id: currentTrainerId,
            name: document.getElementById('exercise-name').value,
            description: document.getElementById('exercise-description').value,
            photo_url: photoUrl,
            video_url: document.getElementById('exercise-video-url').value,
        };

        const exerciseId = exerciseIdInput.value;
        let error;

        if (exerciseId) {
            // Update
            const { error: updateError } = await supabase.from('exercises').update(exerciseData).eq('id', exerciseId);
            error = updateError;
        } else {
            // Create
            const { error: insertError } = await supabase.from('exercises').insert(exerciseData);
            error = insertError;
        }

        if (error) throw error;

        resetForm();
        exerciseFormContainer.classList.add('hidden');
        await fetchAndDisplayExercises();

    } catch (error) {
        console.error('Errore nel salvataggio dell\'esercizio:', error);
        formMessage.textContent = `Errore: ${error.message}`;
        formMessage.className = 'mt-4 text-red-500';
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Salva Esercizio';
    }
}

async function deleteExercise(id, photoUrl) {
    try {
        // Delete from table
        const { error: dbError } = await supabase.from('exercises').delete().eq('id', id);
        if (dbError) throw dbError;

        // Delete photo from storage
        if (photoUrl) {
            const photoPath = photoUrl.split('/exercise_photos/')[1];
            if (photoPath) {
                await supabase.storage.from('exercise_photos').remove([photoPath]);
            }
        }

        await fetchAndDisplayExercises();

    } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'esercizio:', error);
        alert('Impossibile eliminare l\'esercizio.');
    }
}
