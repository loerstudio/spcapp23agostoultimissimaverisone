import supabase from './supabase-client.js';

// DOM Elements
const pageTitle = document.getElementById('page-title');
const programForm = document.getElementById('program-form');
const programNameInput = document.getElementById('program-name');
const programDescriptionInput = document.getElementById('program-description');
const clientAssignmentSelect = document.getElementById('client-assignment');
const programDaysContainer = document.getElementById('program-days-container');
const addDayBtn = document.getElementById('add-day-btn');

// Modal Elements
const exerciseModal = document.getElementById('exercise-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const exerciseSearchInput = document.getElementById('exercise-search');
const exerciseSearchResultsContainer = document.getElementById('exercise-search-results');

let currentProgramId = null;
let currentTrainerId = null;
let dayCounter = 0;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }
    currentTrainerId = user.id;

    const urlParams = new URLSearchParams(window.location.search);
    currentProgramId = urlParams.get('id');

    await populateClientDropdown();

    if (currentProgramId) {
        pageTitle.textContent = 'Edit Workout Program';
        await loadProgramForEditing(currentProgramId);
    } else {
        pageTitle.textContent = 'Create New Program';
    }

    addDayBtn.addEventListener('click', () => addDayBlock());
    programForm.addEventListener('submit', saveProgram);

    // Modal listeners
    closeModalBtn.addEventListener('click', () => exerciseModal.classList.add('hidden'));
    exerciseSearchInput.addEventListener('input', handleExerciseSearch);
});

// --- DATA LOADING AND POPULATION ---

async function populateClientDropdown() {
    try {
        const { data: clients, error } = await supabase.rpc('get_clients_with_details', {
            trainer_id_param: currentTrainerId
        });
        if (error) throw error;

        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = `${client.full_name} (${client.email})`;
            clientAssignmentSelect.appendChild(option);
        });
    } catch (error) {
        console.error('Error populating client dropdown:', error);
    }
}

async function loadProgramForEditing(programId) {
    try {
        programDaysContainer.innerHTML = '<p>Loading program data...</p>';

        // 1. Fetch the main program details
        const { data: program, error: programError } = await supabase
            .from('workout_programs')
            .select('*')
            .eq('id', programId)
            .single();
        if (programError) throw programError;

        // 2. Populate the form fields
        programNameInput.value = program.name;
        programDescriptionInput.value = program.description;
        if (program.client_id) {
            clientAssignmentSelect.value = program.client_id;
        }

        // 3. Fetch the program days
        const { data: days, error: daysError } = await supabase
            .from('workout_program_days')
            .select('*')
            .eq('program_id', programId)
            .order('id'); // It's good practice to have an order
        if (daysError) throw daysError;

        // 4. Fetch all exercises for all days in one go
        const dayIds = days.map(d => d.id);
        const { data: dayExercises, error: exercisesError } = await supabase
            .from('workout_day_exercises')
            .select(`
                *,
                exercises ( name )
            `)
            .in('workout_day_id', dayIds);
        if (exercisesError) throw exercisesError;

        programDaysContainer.innerHTML = ''; // Clear loading message

        // 5. Populate the days and exercises
        days.forEach(day => {
            addDayBlockWithData(day, dayExercises.filter(de => de.workout_day_id === day.id));
        });

    } catch (error) {
        console.error('Error loading program:', error);
        programDaysContainer.innerHTML = `<p class="text-red-500">Failed to load program data: ${error.message}</p>`;
    }
}

function addDayBlockWithData(day, exercises) {
    dayCounter++;
    const dayId = `day-${dayCounter}`;

    const dayBlock = document.createElement('div');
    dayBlock.id = dayId;
    dayBlock.className = 'p-4 border rounded-lg bg-gray-50';
    // Store the original db id for saving later
    dayBlock.setAttribute('data-day-db-id', day.id);
    dayBlock.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <input type="text" value="${day.day_name}" class="day-name-input text-lg font-bold border-b-2" placeholder="Day Name (e.g., Chest Day)">
            <button type="button" class="remove-day-btn bg-red-200 hover:bg-red-300 text-red-800 font-bold py-1 px-2 rounded text-sm">Remove Day</button>
        </div>
        <div class="exercises-container space-y-2">
        </div>
        <button type="button" class="add-exercise-btn mt-2 bg-green-200 hover:bg-green-300 text-green-800 font-bold py-1 px-2 rounded text-sm">Add Exercise</button>
    `;
    programDaysContainer.appendChild(dayBlock);

    const exercisesContainer = dayBlock.querySelector('.exercises-container');
    exercises.forEach(exercise => {
        addExerciseToDayWithData(exercisesContainer, exercise);
    });

    // Add event listeners for the new buttons
    dayBlock.querySelector('.remove-day-btn').addEventListener('click', () => dayBlock.remove());
    dayBlock.querySelector('.add-exercise-btn').addEventListener('click', (e) => {
        exerciseModal.setAttribute('data-day-id', dayId);
        exerciseModal.classList.remove('hidden');
        exerciseSearchInput.focus();
    });
}

function addExerciseToDayWithData(container, exerciseData) {
    const exerciseElement = document.createElement('div');
    exerciseElement.className = 'exercise-item flex items-center space-x-2 bg-white p-2 rounded';
    exerciseElement.setAttribute('data-exercise-id', exerciseData.exercise_id);
    // Store the original db id for saving later
    exerciseElement.setAttribute('data-exercise-db-id', exerciseData.id);
    exerciseElement.innerHTML = `
        <span class="font-semibold flex-grow">${exerciseData.exercises.name}</span>
        <input type="text" class="exercise-sets w-16 border rounded px-1" placeholder="Sets" value="${exerciseData.sets || ''}">
        <input type="text" class="exercise-reps w-16 border rounded px-1" placeholder="Reps" value="${exerciseData.reps || ''}">
        <input type="text" class="exercise-notes w-32 border rounded px-1" placeholder="Notes (optional)" value="${exerciseData.notes || ''}">
        <button type="button" class="remove-exercise-btn text-red-500 hover:text-red-700">✖</button>
    `;
    container.appendChild(exerciseElement);
    exerciseElement.querySelector('.remove-exercise-btn').addEventListener('click', () => exerciseElement.remove());
}

// --- DYNAMIC FORM LOGIC ---

function addDayBlock(dayData = null) {
    dayCounter++;
    const dayId = `day-${dayCounter}`;

    const dayBlock = document.createElement('div');
    dayBlock.id = dayId;
    dayBlock.className = 'p-4 border rounded-lg bg-gray-50';
    dayBlock.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <input type="text" value="${dayData ? dayData.name : `Day ${dayCounter}`}" class="day-name-input text-lg font-bold border-b-2" placeholder="Day Name (e.g., Chest Day)">
            <button type="button" class="remove-day-btn bg-red-200 hover:bg-red-300 text-red-800 font-bold py-1 px-2 rounded text-sm">Remove Day</button>
        </div>
        <div class="exercises-container space-y-2">
            <!-- Exercises for this day will be added here -->
        </div>
        <button type="button" class="add-exercise-btn mt-2 bg-green-200 hover:bg-green-300 text-green-800 font-bold py-1 px-2 rounded text-sm">Add Exercise</button>
    `;

    programDaysContainer.appendChild(dayBlock);

    // Add event listeners for the new buttons
    dayBlock.querySelector('.remove-day-btn').addEventListener('click', () => dayBlock.remove());
    dayBlock.querySelector('.add-exercise-btn').addEventListener('click', (e) => {
        // Store which day's "Add" button was clicked
        exerciseModal.setAttribute('data-day-id', dayId);
        exerciseModal.classList.remove('hidden');
        exerciseSearchInput.focus();
    });
}

// --- EXERCISE MODAL LOGIC ---

async function handleExerciseSearch(e) {
    const searchTerm = e.target.value.trim();
    exerciseSearchResultsContainer.innerHTML = '';

    if (searchTerm.length < 2) {
        return;
    }

    try {
        const { data: exercises, error } = await supabase
            .from('exercises')
            .select('id, name')
            .ilike('name', `%${searchTerm}%`)
            .limit(10);

        if (error) throw error;

        if (exercises.length === 0) {
            exerciseSearchResultsContainer.innerHTML = '<p>No exercises found.</p>';
        } else {
            exercises.forEach(exercise => {
                const resultItem = document.createElement('div');
                resultItem.className = 'p-2 hover:bg-gray-200 cursor-pointer';
                resultItem.textContent = exercise.name;
                resultItem.addEventListener('click', () => addExerciseToDay(exercise));
                exerciseSearchResultsContainer.appendChild(resultItem);
            });
        }
    } catch (error) {
        console.error('Error searching exercises:', error);
        exerciseSearchResultsContainer.innerHTML = '<p class="text-red-500">Error searching.</p>';
    }
}

function addExerciseToDay(exercise) {
    const dayId = exerciseModal.getAttribute('data-day-id');
    const dayBlock = document.getElementById(dayId);
    const exercisesContainer = dayBlock.querySelector('.exercises-container');

    const exerciseElement = document.createElement('div');
    exerciseElement.className = 'exercise-item flex items-center space-x-2 bg-white p-2 rounded';
    exerciseElement.setAttribute('data-exercise-id', exercise.id);
    exerciseElement.innerHTML = `
        <span class="font-semibold flex-grow">${exercise.name}</span>
        <input type="text" class="exercise-sets w-16 border rounded px-1" placeholder="Sets">
        <input type="text" class="exercise-reps w-16 border rounded px-1" placeholder="Reps">
        <input type="text" class="exercise-notes w-32 border rounded px-1" placeholder="Notes (optional)">
        <button type="button" class="remove-exercise-btn text-red-500 hover:text-red-700">✖</button>
    `;

    exercisesContainer.appendChild(exerciseElement);
    exerciseElement.querySelector('.remove-exercise-btn').addEventListener('click', () => exerciseElement.remove());

    // Close modal after adding
    exerciseModal.classList.add('hidden');
    exerciseSearchInput.value = '';
    exerciseSearchResultsContainer.innerHTML = '';
}


// --- SAVE LOGIC ---

async function saveProgram(e) {
    e.preventDefault();
    const saveButton = e.target.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';

    try {
        // 1. Gather program details
        const programName = programNameInput.value;
        const programDescription = programDescriptionInput.value;
        const assignedClientId = clientAssignmentSelect.value || null;

        // 2. Gather days and exercises data
        const daysData = [];
        const dayElements = programDaysContainer.querySelectorAll('.p-4.border');

        dayElements.forEach(dayEl => {
            const dayName = dayEl.querySelector('.day-name-input').value;
            const exercises = [];
            const exerciseElements = dayEl.querySelectorAll('.exercise-item');

            exerciseElements.forEach(exEl => {
                exercises.push({
                    exercise_id: exEl.getAttribute('data-exercise-id'),
                    sets: exEl.querySelector('.exercise-sets').value,
                    reps: exEl.querySelector('.exercise-reps').value,
                    notes: exEl.querySelector('.exercise-notes').value,
                });
            });

            daysData.push({
                day_name: dayName,
                exercises: exercises,
            });
        });

        // 3. Call the RPC function
        const { data, error } = await supabase.rpc('save_workout_program', {
            p_program_id: currentProgramId,
            p_trainer_id: currentTrainerId,
            p_name: programName,
            p_description: programDescription,
            p_client_id: assignedClientId,
            p_days: daysData
        });

        if (error) throw error;

        // 4. Handle success
        alert('Program saved successfully!');
        window.location.href = 'programsmanagementtrainer.html';

    } catch (error) {
        console.error('Error saving program:', error);
        alert(`Failed to save program: ${error.message}`);
        saveButton.disabled = false;
        saveButton.textContent = 'Save Program';
    }
}
