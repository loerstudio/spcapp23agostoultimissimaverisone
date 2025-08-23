import supabase from './supabase-client.js';

const signInForm = document.querySelector('#sign-in-form');
const errorMessage = document.querySelector('#error-message');

if (signInForm) {
    signInForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = event.target.email.value;
        const password = event.target.password.value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                throw error;
            }

            if (data.user) {
                // Get user role from profiles table
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('user_role')
                    .eq('id', data.user.id)
                    .single();

                if (profileError) {
                    throw profileError;
                }

                if (profile) {
                    if (profile.user_role === 'trainer') {
                        window.location.href = 'hometrainer.html';
                    } else {
                        window.location.href = 'homeclient.html';
                    }
                } else {
                    // Handle case where profile is not found
                    errorMessage.textContent = 'User profile not found. Please contact support.';
                }
            }

        } catch (error) {
            errorMessage.textContent = error.message;
        }
    });
}

const signUpForm = document.querySelector('#sign-up-form');
const message = document.querySelector('#message');

if (signUpForm) {
    signUpForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const fullName = event.target.full_name.value;
        const email = event.target.email.value;
        const password = event.target.password.value;
        const userRole = event.target.user_role.value;

        try {
            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        user_role: userRole,
                    }
                }
            });

            if (error) {
                throw error;
            }

            if (data.user) {
                message.textContent = 'Sign up successful! Please check your email for a confirmation link.';
                signUpForm.reset();
            }

        } catch (error) {
            message.textContent = error.message;
            message.classList.remove('text-green-500');
            message.classList.add('text-red-500');
        }
    });
}

// Sign-out logic (can be called from a logout button)
window.signOut = async function() {
    const { error } = await supabase.auth.signOut();
    if (!error) {
        window.location.href = 'signin.html';
    } else {
        console.error('Error signing out:', error);
    }
}
