import supabase from './supabase-client.js';

// DOM Elements
const toggleFormBtn = document.getElementById('toggle-form-btn');
const foodFormContainer = document.getElementById('food-form-container');
const foodForm = document.getElementById('food-form');
const formTitle = document.getElementById('form-title');
const cancelEditBtn = document.getElementById('cancel-edit-btn');
const foodListContainer = document.getElementById('food-list');
const photoInput = document.getElementById('food-photo');
const photoPreview = document.getElementById('photo-preview');
const formMessage = document.getElementById('form-message');
const foodIdInput = document.getElementById('food-id');

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
        foodFormContainer.classList.toggle('hidden');
    });

    cancelEditBtn.addEventListener('click', () => {
        resetForm();
        foodFormContainer.classList.add('hidden');
    });

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (file) {
            photoPreview.src = URL.createObjectURL(file);
            photoPreview.classList.remove('hidden');
        }
    });

    foodForm.addEventListener('submit', saveFood);

    await fetchAndDisplayFoods();
});

// --- DATA FETCH AND DISPLAY ---
async function fetchAndDisplayFoods() {
    foodListContainer.innerHTML = '<p>Loading food library...</p>';
    try {
        const { data: foods, error } = await supabase
            .from('foods')
            .select('*')
            .eq('trainer_id', currentTrainerId)
            .order('name');

        if (error) throw error;

        displayFoods(foods);

    } catch (error) {
        console.error('Error fetching foods:', error);
        foodListContainer.innerHTML = '<p class="text-red-500">Error loading food library.</p>';
    }
}

function displayFoods(foods) {
    foodListContainer.innerHTML = '';
    if (foods.length === 0) {
        foodListContainer.innerHTML = '<p>Your food library is empty. Add a food item to get started!</p>';
        return;
    }

    foods.forEach(food => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-md flex flex-col';
        card.innerHTML = `
            <img src="${food.photo_url || 'https://via.placeholder.com/150'}" alt="${food.name}" class="w-full h-40 object-cover rounded-md mb-4">
            <h3 class="text-lg font-bold">${food.name}</h3>
            <div class="text-sm text-gray-600 flex-grow">
                <p>Cals: ${food.calories || 'N/A'}</p>
                <p>P: ${food.protein || 'N/A'}g | C: ${food.carbs || 'N/A'}g | F: ${food.fat || 'N/A'}g</p>
            </div>
            <div class="mt-4 flex justify-end space-x-2">
                <button data-id="${food.id}" class="edit-btn bg-blue-500 text-white py-1 px-3 rounded">Edit</button>
                <button data-id="${food.id}" data-photo="${food.photo_url || ''}" class="delete-btn bg-red-500 text-white py-1 px-3 rounded">Delete</button>
            </div>
        `;
        foodListContainer.appendChild(card);
    });

    // Add event listeners
    document.querySelectorAll('.edit-btn').forEach(btn => btn.addEventListener('click', (e) => {
        const id = e.target.getAttribute('data-id');
        const foodToEdit = foods.find(f => f.id == id);
        populateFormForEdit(foodToEdit);
    }));

    document.querySelectorAll('.delete-btn').forEach(btn => btn.addEventListener('click', (e) => {
        if (confirm('Are you sure you want to delete this food item?')) {
            const id = e.target.getAttribute('data-id');
            const photoUrl = e.target.getAttribute('data-photo');
            deleteFood(id, photoUrl);
        }
    }));
}

// --- FORM HANDLING ---
function populateFormForEdit(food) {
    resetForm();
    formTitle.textContent = 'Edit Food';
    foodIdInput.value = food.id;
    document.getElementById('food-name').value = food.name;
    document.getElementById('food-calories').value = food.calories;
    document.getElementById('food-protein').value = food.protein;
    document.getElementById('food-carbs').value = food.carbs;
    document.getElementById('food-fat').value = food.fat;
    if (food.photo_url) {
        photoPreview.src = food.photo_url;
        photoPreview.classList.remove('hidden');
    }
    foodFormContainer.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function resetForm() {
    foodForm.reset();
    foodIdInput.value = '';
    photoPreview.classList.add('hidden');
    photoPreview.src = '';
    formTitle.textContent = 'Add New Food';
    formMessage.textContent = '';
    formMessage.className = 'mt-4';
}

// --- CRUD OPERATIONS ---
async function saveFood(e) {
    e.preventDefault();
    const saveButton = e.target.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = 'Saving...';
    formMessage.textContent = '';

    try {
        let photoUrl = photoPreview.src.startsWith('http') ? photoPreview.src : null;
        const file = photoInput.files[0];

        if (file) {
            const fileName = `${currentTrainerId}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage.from('food_photos').upload(fileName, file, { upsert: false });
            if (uploadError) throw uploadError;
            const { data: urlData } = supabase.storage.from('food_photos').getPublicUrl(fileName);
            photoUrl = urlData.publicUrl;
        }

        const foodData = {
            trainer_id: currentTrainerId,
            name: document.getElementById('food-name').value,
            calories: document.getElementById('food-calories').value,
            protein: document.getElementById('food-protein').value,
            carbs: document.getElementById('food-carbs').value,
            fat: document.getElementById('food-fat').value,
            photo_url: photoUrl,
        };

        const foodId = foodIdInput.value;
        let error;

        if (foodId) {
            ({ error } = await supabase.from('foods').update(foodData).eq('id', foodId));
        } else {
            ({ error } = await supabase.from('foods').insert(foodData));
        }

        if (error) throw error;

        resetForm();
        foodFormContainer.classList.add('hidden');
        await fetchAndDisplayFoods();

    } catch (error) {
        console.error('Error saving food:', error);
        formMessage.textContent = `Error: ${error.message}`;
        formMessage.className = 'mt-4 text-red-500';
    } finally {
        saveButton.disabled = false;
        saveButton.textContent = 'Save Food';
    }
}

async function deleteFood(id, photoUrl) {
    try {
        await supabase.from('foods').delete().eq('id', id);
        if (photoUrl) {
            const photoPath = photoUrl.split('/food_photos/')[1];
            if (photoPath) {
                await supabase.storage.from('food_photos').remove([photoPath]);
            }
        }
        await fetchAndDisplayFoods();
    } catch (error) {
        console.error('Error deleting food:', error);
        alert('Failed to delete food item.');
    }
}
