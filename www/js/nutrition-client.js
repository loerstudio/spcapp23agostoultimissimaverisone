import supabase from './supabase-client.js';

// DOM Elements
const planNameEl = document.getElementById('plan-name');
const planDescriptionEl = document.getElementById('plan-description');
const daysAccordion = document.getElementById('days-accordion');

let currentClientId = null;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'signin.html';
        return;
    }
    currentClientId = user.id;
    await fetchFullMealPlan(currentClientId);
});


async function fetchFullMealPlan(clientId) {
    try {
        // 1. Fetch assigned meal plan
        const { data: plan, error: planError } = await supabase
            .from('meal_plans')
            .select('*')
            .eq('client_id', clientId)
            .limit(1)
            .single();

        if (planError) {
            if (planError.code === 'PGRST116') {
                planNameEl.textContent = 'Nessun Piano Alimentare Assegnato';
                planDescriptionEl.textContent = 'Il tuo allenatore non ti ha ancora assegnato un piano alimentare.';
            } else {
                throw planError;
            }
            return;
        }

        // 2. Fetch meal plan days
        const { data: days, error: daysError } = await supabase
            .from('meal_plan_days')
            .select('*')
            .eq('meal_plan_id', plan.id)
            .order('id');
        if (daysError) throw daysError;

        // 3. Fetch food items for all days
        const dayIds = days.map(d => d.id);
        const { data: dayFoods, error: foodsError } = await supabase
            .from('meal_day_foods')
            .select(`
                *,
                foods ( * )
            `)
            .in('meal_day_id', dayIds);
        if (foodsError) throw foodsError;

        displayMealPlan(plan, days, dayFoods);

    } catch (error) {
        console.error('Errore caricamento piano alimentare:', error);
        planNameEl.textContent = 'Errore';
        planDescriptionEl.textContent = 'Impossibile caricare il tuo piano alimentare.';
    }
}

function displayMealPlan(plan, days, dayFoods) {
    planNameEl.textContent = plan.name;
    planDescriptionEl.textContent = plan.description;
    daysAccordion.innerHTML = '';

    if (days.length === 0) {
        daysAccordion.innerHTML = '<p>Questo piano alimentare non ha ancora giorni definiti.</p>';
        return;
    }

    days.forEach(day => {
        const dayWrapper = document.createElement('div');
        dayWrapper.className = 'bg-white rounded-lg shadow-md';

        const foodsForDay = dayFoods.filter(df => df.meal_day_id === day.id);

        // Group foods by meal type
        const meals = foodsForDay.reduce((acc, food) => {
            const type = food.meal_type || 'Non categorizzato';
            if (!acc[type]) {
                acc[type] = [];
            }
            acc[type].push(food);
            return acc;
        }, {});

        dayWrapper.innerHTML = `
            <div class="day-header p-4 cursor-pointer flex justify-between items-center">
                <h2 class="text-2xl font-bold">${day.day_name}</h2>
                <svg class="w-6 h-6 transform transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
            <div class="day-content p-4 border-t hidden">
                ${Object.keys(meals).map(mealType => `
                    <div class="meal-section mb-4">
                        <h3 class="text-xl font-semibold border-b pb-1 mb-2">${mealType}</h3>
                        <div class="space-y-3">
                            ${meals[mealType].map(item => `
                                <div class="food-item p-3 border rounded-lg flex gap-4">
                                    <img src="${item.foods.photo_url || 'https://via.placeholder.com/100'}" alt="${item.foods.name}" class="w-24 h-24 object-cover rounded-md">
                                    <div>
                                        <h4 class="font-bold">${item.foods.name}</h4>
                                        <p class="text-gray-700"><strong>Quantità:</strong> ${item.quantity}</p>
                                        <p class="text-sm text-gray-600">
                                            Cal: ${item.foods.calories || 'N/A'} |
                                            P: ${item.foods.protein || 'N/A'}g |
                                            C: ${item.foods.carbs || 'N/A'}g |
                                            F: ${item.foods.fat || 'N/A'}g
                                        </p>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        daysAccordion.appendChild(dayWrapper);
    });

    // Accordion functionality
    daysAccordion.querySelectorAll('.day-header').forEach(header => {
        header.addEventListener('click', () => {
            const content = header.nextElementSibling;
            const icon = header.querySelector('svg');
            content.classList.toggle('hidden');
            icon.classList.toggle('rotate-180');
        });
    });
}
