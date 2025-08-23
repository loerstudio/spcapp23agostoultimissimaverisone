import supabase from './supabase-client.js';

// DOM Elements
const searchInput = document.getElementById('search-input');
const foodListContainer = document.getElementById('food-list');

let allFoods = []; // Cache all foods to filter client-side

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    await fetchAndDisplayFoods();
    searchInput.addEventListener('input', handleSearch);
});


async function fetchAndDisplayFoods() {
    foodListContainer.innerHTML = '<p>Loading food library...</p>';
    try {
        const { data, error } = await supabase
            .from('foods')
            .select('*')
            .order('name');

        if (error) throw error;
        allFoods = data;
        displayFoods(allFoods);

    } catch (error) {
        console.error('Error fetching foods:', error);
        foodListContainer.innerHTML = '<p class="text-red-500">Could not load food library.</p>';
    }
}

function displayFoods(foods) {
    foodListContainer.innerHTML = '';
    if (foods.length === 0) {
        foodListContainer.innerHTML = '<p>No food items found in the library.</p>';
        return;
    }

    foods.forEach(food => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col';
        card.innerHTML = `
            <img src="${food.photo_url || 'https://via.placeholder.com/150'}" alt="${food.name}" class="w-full h-40 object-cover rounded-md mb-4">
            <h3 class="text-lg font-bold">${food.name}</h3>
            <div class="text-sm text-gray-600 mt-2 flex-grow">
                <p>Cals: ${food.calories || 'N/A'}</p>
                <p>P: ${food.protein || 'N/A'}g | C: ${food.carbs || 'N/A'}g | F: ${food.fat || 'N/A'}g</p>
            </div>
        `;
        foodListContainer.appendChild(card);
    });
}

function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredFoods = allFoods.filter(food =>
        food.name.toLowerCase().includes(searchTerm)
    );
    displayFoods(filteredFoods);
}
