import supabase from './supabase-client.js';

// DOM Elements
const exerciseNameEl = document.getElementById('exercise-name');
const setsRepsEl = document.getElementById('exercise-sets-reps');
const mediaContainer = document.getElementById('media-container');
const notesEl = document.getElementById('exercise-notes');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const finishBtn = document.getElementById('finish-btn');
const workoutContainer = document.getElementById('workout-container');

let exercises = [];
let currentExerciseIndex = -1;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const dayId = urlParams.get('day_id');

    if (!dayId) {
        workoutContainer.innerHTML = '<h1 class="text-3xl text-red-500">Nessun giorno di allenamento specificato.</h1>';
        return;
    }

    await fetchExercises(dayId);

    prevBtn.addEventListener('click', showPreviousExercise);
    nextBtn.addEventListener('click', showNextExercise);
    finishBtn.addEventListener('click', finishWorkout);
});


async function fetchExercises(dayId) {
    try {
        const { data, error } = await supabase
            .from('workout_day_exercises')
            .select(`
                *,
                exercises ( name, description, photo_url, video_url )
            `)
            .eq('workout_day_id', dayId)
            .order('id'); // Use the join table's id to preserve order

        if (error) throw error;

        exercises = data;
        if (exercises.length > 0) {
            showNextExercise(); // Start with the first exercise
        } else {
            workoutContainer.innerHTML = '<h1 class="text-3xl">Questo giorno di allenamento non ha esercizi.</h1>';
        }

    } catch (error) {
        console.error('Errore caricamento esercizi:', error);
        workoutContainer.innerHTML = '<h1 class="text-3xl text-red-500">Impossibile caricare l\'allenamento.</h1>';
    }
}

function displayExercise(index) {
    const exerciseData = exercises[index];
    const exercise = exerciseData.exercises;

    exerciseNameEl.textContent = exercise.name;
    setsRepsEl.textContent = `Serie: ${exerciseData.sets} | Ripetizioni: ${exerciseData.reps}`;
    notesEl.textContent = exerciseData.notes || '';

    // Display video if available, otherwise photo
    if (exercise.video_url && exercise.video_url.includes('youtube.com')) {
        const videoId = new URL(exercise.video_url).searchParams.get('v');
        mediaContainer.innerHTML = `
            <iframe class="w-full h-96" src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
        `;
    } else if (exercise.photo_url) {
        mediaContainer.innerHTML = `<img src="${exercise.photo_url}" alt="${exercise.name}" class="w-full h-96 object-contain rounded-lg">`;
    } else {
        mediaContainer.innerHTML = ''; // No media
    }

    // Update button states
    prevBtn.disabled = index === 0;
    prevBtn.classList.toggle('opacity-50', index === 0);

    if (index === exercises.length - 1) {
        nextBtn.classList.add('hidden');
        finishBtn.classList.remove('hidden');
    } else {
        nextBtn.classList.remove('hidden');
        finishBtn.classList.add('hidden');
    }
}


function showNextExercise() {
    if (currentExerciseIndex < exercises.length - 1) {
        currentExerciseIndex++;
        displayExercise(currentExerciseIndex);
    }
}

function showPreviousExercise() {
    if (currentExerciseIndex > 0) {
        currentExerciseIndex--;
        displayExercise(currentExerciseIndex);
    }
}

function finishWorkout() {
    workoutContainer.innerHTML = `
        <h1 class="text-6xl font-bold text-green-400">Allenamento Completato!</h1>
        <p class="text-2xl mt-4">Ottimo lavoro!</p>
        <a href="workoutclient.html" class="mt-8 inline-block bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-6 rounded">Torna al Programma</a>
    `;
}
