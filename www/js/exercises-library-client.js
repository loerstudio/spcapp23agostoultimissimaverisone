import supabase from './supabase-client.js';

// DOM Elements
const searchInput = document.getElementById('search-input');
const exerciseListContainer = document.getElementById('exercise-list');

let allExercises = []; // Cache all exercises to filter client-side

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await fetchAndDisplayExercises();
    searchInput.addEventListener('input', handleSearch);
});


async function fetchAndDisplayExercises() {
    exerciseListContainer.innerHTML = '<p>Caricamento esercizi...</p>';
    try {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .order('name');

        if (error) throw error;
        allExercises = data;
        displayExercises(allExercises);

    } catch (error) {
        console.error('Errore caricamento esercizi:', error);
        exerciseListContainer.innerHTML = '<p class="text-red-500">Impossibile caricare la libreria esercizi.</p>';
    }
}

function displayExercises(exercises) {
    exerciseListContainer.innerHTML = '';
    if (exercises.length === 0) {
        exerciseListContainer.innerHTML = '<p>Nessun esercizio trovato nella libreria.</p>';
        return;
    }

    exercises.forEach(exercise => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col';
        card.innerHTML = `
            <img src="${exercise.photo_url || 'https://via.placeholder.com/150'}" alt="${exercise.name}" class="w-full h-48 object-cover rounded-md mb-4">
            <h3 class="text-xl font-bold">${exercise.name}</h3>
            <p class="text-gray-700 mt-2 flex-grow">${exercise.description || ''}</p>
            ${exercise.video_url ? `<a href="${exercise.video_url}" target="_blank" class="text-blue-500 hover:underline mt-4 self-start">Guarda Video</a>` : ''}
        `;
        exerciseListContainer.appendChild(card);
    });
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredExercises = allExercises.filter(exercise =>
        exercise.name.toLowerCase().includes(searchTerm) ||
        (exercise.description && exercise.description.toLowerCase().includes(searchTerm))
    );
    displayExercises(filteredExercises);
}
