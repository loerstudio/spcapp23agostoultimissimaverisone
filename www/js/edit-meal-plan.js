import supabase from './supabase-client.js';

// DOM Elements
const pageTitle = document.getElementById('page-title');
const mealPlanForm = document.getElementById('meal-plan-form');
const planNameInput = document.getElementById('plan-name');
const planDescriptionInput = document.getElementById('plan-description');
const clientAssignmentSelect = document.getElementById('client-assignment');
const mealDaysContainer = document.getElementById('meal-days-container');
const addDayBtn = document.getElementById('add-day-btn');

// Modal Elements
const foodModal = document.getElementById('food-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const foodSearchInput = document.getElementById('food-search');
const foodSearchResultsContainer = document.getElementById('food-search-results');

let currentPlanId = null;
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
    currentPlanId = urlParams.get('id');

    await populateClientDropdown();

    if (currentPlanId) {
        pageTitle.textContent = 'Modifica Piano Alimentare';
        await loadMealPlanForEditing(currentPlanId);
    } else {
        pageTitle.textContent = 'Crea Nuovo Piano Alimentare';
    }

    addDayBtn.addEventListener('click', () => addDayBlock());
    mealPlanForm.addEventListener('submit', saveMealPlan);

    closeModalBtn.addEventListener('click', () => foodModal.classList.add('hidden'));
    foodSearchInput.addEventListener('input', handleFoodSearch);
});

// --- DATA LOADING ---

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
        console.error('Errore nel popolamento del menu a tendina dei clienti:', error);
    }
}

async function loadMealPlanForEditing(planId) {
    try {
        mealDaysContainer.innerHTML = '<p>Caricamento dati piano alimentare...</p>';

        const { data: plan, error: planError } = await supabase.from('meal_plans').select('*').eq('id', planId).single();
        if (planError) throw planError;

        planNameInput.value = plan.name;
        planDescriptionInput.value = plan.description;
        if (plan.client_id) {
            clientAssignmentSelect.value = plan.client_id;
        }

        const { data: days, error: daysError } = await supabase.from('meal_plan_days').select('*').eq('meal_plan_id', planId).order('id');
        if (daysError) throw daysError;

        const dayIds = days.map(d => d.id);
        const { data: dayFoods, error: foodsError } = await supabase.from('meal_day_foods').select(`*, foods ( name, calories )`).in('meal_day_id', dayIds);
        if (foodsError) throw foodsError;

        mealDaysContainer.innerHTML = '';

        days.forEach(day => {
            addDayBlockWithData(day, dayFoods.filter(df => df.meal_day_id === day.id));
        });

    } catch (error) {
        console.error('Errore caricamento piano alimentare:', error);
        mealDaysContainer.innerHTML = `<p class="text-red-500">Impossibile caricare i dati del piano alimentare: ${error.message}</p>`;
    }
}

function addDayBlockWithData(day, foods) {
    dayCounter++;
    const dayId = `day-${dayCounter}`;

    const dayBlock = document.createElement('div');
    dayBlock.id = dayId;
    dayBlock.className = 'p-4 border rounded-lg bg-gray-50';
    dayBlock.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <input type="text" value="${day.day_name}" class="day-name-input text-lg font-bold border-b-2" placeholder="Nome Giorno">
            <button type="button" class="remove-day-btn bg-red-200 hover:bg-red-300 text-red-800 font-bold py-1 px-2 rounded text-sm">Rimuovi Giorno</button>
        </div>
        <div class="meals-container space-y-3">
            ${createMealSection('Colazione', 'Breakfast')}
            ${createMealSection('Pranzo', 'Lunch')}
            ${createMealSection('Cena', 'Dinner')}
            ${createMealSection('Spuntini', 'Snacks')}
        </div>
    `;
    mealDaysContainer.appendChild(dayBlock);

    foods.forEach(foodItem => {
        const foodsContainer = dayBlock.querySelector(`.meal-section[data-meal-type="${foodItem.meal_type}"] .foods-container`);
        if (foodsContainer) {
            addFoodToMealWithData(foodsContainer, foodItem);
        }
    });

    dayBlock.querySelector('.remove-day-btn').addEventListener('click', () => dayBlock.remove());
    dayBlock.querySelectorAll('.add-food-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mealType = e.target.closest('.meal-section').getAttribute('data-meal-type');
            foodModal.setAttribute('data-day-id', dayId);
            foodModal.setAttribute('data-meal-type', mealType);
            foodModal.classList.remove('hidden');
            foodSearchInput.focus();
        });
    });
}

function addFoodToMealWithData(container, foodData) {
    const foodElement = document.createElement('div');
    foodElement.className = 'food-item flex items-center space-x-2 bg-white p-2 rounded';
    foodElement.setAttribute('data-food-id', foodData.food_id);
    foodElement.innerHTML = `
        <span class="font-semibold flex-grow">${foodData.foods.name}</span>
        <input type="text" class="food-quantity w-32 border rounded px-1" placeholder="Quantità (es. 100g)" value="${foodData.quantity || ''}">
        <button type="button" class="remove-food-btn text-red-500 hover:text-red-700">✖</button>
    `;
    container.appendChild(foodElement);
    foodElement.querySelector('.remove-food-btn').addEventListener('click', () => foodElement.remove());
}

// --- DYNAMIC UI ---

function addDayBlock(dayData = null) {
    dayCounter++;
    const dayId = `day-${dayCounter}`;

    const dayBlock = document.createElement('div');
    dayBlock.id = dayId;
    dayBlock.className = 'p-4 border rounded-lg bg-gray-50';
    dayBlock.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <input type="text" value="${dayData ? dayData.name : `Giorno ${dayCounter}`}" class="day-name-input text-lg font-bold border-b-2" placeholder="Nome Giorno">
            <button type="button" class="remove-day-btn bg-red-200 hover:bg-red-300 text-red-800 font-bold py-1 px-2 rounded text-sm">Rimuovi Giorno</button>
        </div>
        <div class="meals-container space-y-3">
            ${createMealSection('Colazione', 'Breakfast')}
            ${createMealSection('Pranzo', 'Lunch')}
            ${createMealSection('Cena', 'Dinner')}
            ${createMealSection('Spuntini', 'Snacks')}
        </div>
    `;
    mealDaysContainer.appendChild(dayBlock);

    dayBlock.querySelector('.remove-day-btn').addEventListener('click', () => dayBlock.remove());
    dayBlock.querySelectorAll('.add-food-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const mealType = e.target.closest('.meal-section').getAttribute('data-meal-type');
            foodModal.setAttribute('data-day-id', dayId);
            foodModal.setAttribute('data-meal-type', mealType);
            foodModal.classList.remove('hidden');
            foodSearchInput.focus();
        });
    });
}

function createMealSection(mealName, mealType) {
    return `
        <div class="meal-section border-t pt-2" data-meal-type="${mealType}">
            <div class="flex justify-between items-center">
                 <h4 class="font-semibold">${mealName}</h4>
                 <button type="button" class="add-food-btn text-blue-500 hover:text-blue-700 text-sm font-bold">Aggiungi Alimento +</button>
            </div>
            <div class="foods-container space-y-1 mt-1"></div>
        </div>
    `;
}

// --- MODAL LOGIC ---

async function handleFoodSearch(e) {
    const searchTerm = e.target.value.trim();
    foodSearchResultsContainer.innerHTML = '';

    if (searchTerm.length < 2) return;

    try {
        const { data: foods, error } = await supabase.from('foods').select('id, name, calories').ilike('name', `%${searchTerm}%`).limit(10);
        if (error) throw error;

        if (foods.length === 0) {
            foodSearchResultsContainer.innerHTML = '<p>Nessun alimento trovato.</p>';
        } else {
            foods.forEach(food => {
                const resultItem = document.createElement('div');
                resultItem.className = 'p-2 hover:bg-gray-200 cursor-pointer';
                resultItem.textContent = `${food.name} (${food.calories} kcal)`;
                resultItem.addEventListener('click', () => addFoodToMeal(food));
                foodSearchResultsContainer.appendChild(resultItem);
            });
        }
    } catch (error) {
        console.error('Errore ricerca alimenti:', error);
        foodSearchResultsContainer.innerHTML = '<p class="text-red-500">Errore ricerca.</p>';
    }
}

function addFoodToMeal(food) {
    const dayId = foodModal.getAttribute('data-day-id');
    const mealType = foodModal.getAttribute('data-meal-type');
    const foodsContainer = document.querySelector(`#${dayId} .meal-section[data-meal-type="${mealType}"] .foods-container`);

    const foodElement = document.createElement('div');
    foodElement.className = 'food-item flex items-center space-x-2 bg-white p-2 rounded';
    foodElement.setAttribute('data-food-id', food.id);
    foodElement.innerHTML = `
        <span class="font-semibold flex-grow">${food.name}</span>
        <input type="text" class="food-quantity w-32 border rounded px-1" placeholder="Quantità (es. 100g)">
        <button type="button" class="remove-food-btn text-red-500 hover:text-red-700">✖</button>
    `;

    foodsContainer.appendChild(foodElement);
    foodElement.querySelector('.remove-food-btn').addEventListener('click', () => foodElement.remove());

    foodModal.classList.add('hidden');
    foodSearchInput.value = '';
    foodSearchResultsContainer.innerHTML = '';
}

// --- SAVE LOGIC ---
async function saveMealPlan(e) {
    e.preventDefault();
    const saveButton = e.target.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = 'Salvataggio...';

    try {
        const planName = planNameInput.value;
        const planDescription = planDescriptionInput.value;
        const assignedClientId = clientAssignmentSelect.value || null;

        const daysData = [];
        const dayElements = mealDaysContainer.querySelectorAll('.p-4.border');

        dayElements.forEach(dayEl => {
            const dayName = dayEl.querySelector('.day-name-input').value;
            const meals = [];
            const mealSections = dayEl.querySelectorAll('.meal-section');

            mealSections.forEach(mealEl => {
                const mealType = mealEl.getAttribute('data-meal-type');
                const foodElements = mealEl.querySelectorAll('.food-item');

                foodElements.forEach(foodEl => {
                    meals.push({
                        food_id: foodEl.getAttribute('data-food-id'),
                        meal_type: mealType,
                        quantity: foodEl.querySelector('.food-quantity').value,
                    });
                });
            });

            daysData.push({
                day_name: dayName,
                meals: meals,
            });
        });

        const { error } = await supabase.rpc('save_meal_plan', {
            p_plan_id: currentPlanId,
            p_trainer_id: currentTrainerId,
            p_name: planName,
            p_description: planDescription,
            p_client_id: assignedClientId,
            p_days: daysData
        });

        if (error) throw error;

        alert('Piano Alimentare salvato con successo!');
        window.location.href = 'nutritiontrainer.html';

    } catch (error) {
        console.error('Errore salvataggio piano alimentare:', error);
        alert(`Impossibile salvare il piano alimentare: ${error.message}`);
        saveButton.disabled = false;
        saveButton.textContent = 'Salva Piano Alimentare';
    }
}
