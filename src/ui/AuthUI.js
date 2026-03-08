import { supabase } from '../supabaseClient.js';

export class AuthUI {
    constructor(game, startMenu, profileMenu) {
        this.game = game;
        this.startMenu = startMenu;
        this.profileMenu = profileMenu;

        // State
        this.isLoginMode = true;
        this.isGuestMode = false;
        this.isGuest = false;

        // DOM Elements
        this.ccMenu = document.getElementById('character-creation-menu');
        this.ccUsername = document.getElementById('cc-username');
        this.ccName = document.getElementById('cc-name');
        this.ccNicknameContainer = document.getElementById('cc-nickname-container');
        this.ccPassword = document.getElementById('cc-password');
        this.ccClass = document.getElementById('cc-class');
        this.ccClassContainer = document.getElementById('cc-class-container');
        this.ccCreateBtn = document.getElementById('cc-create-btn');
        this.ccErrorMsg = document.getElementById('cc-error-msg');
        this.ccToggleMode = document.getElementById('cc-toggle-mode');
        this.ccTitle = document.getElementById('cc-title');
        this.ccSubtitle = document.getElementById('cc-subtitle');
        this.ccEmailContainer = document.getElementById('cc-email-container');
        this.ccEmail = document.getElementById('cc-email');
        this.ccUsernameLabel = document.getElementById('cc-username-label');
        this.togglePasswordBtn = document.getElementById('toggle-password-btn');

        this.mageClassSelect = document.getElementById('mage-class-select');
        this.profileUsernameUI = document.getElementById('profile-username');
        this.profileNickname = document.getElementById('profile-nickname');

        // Guest DOM
        this.ccGuestBtn = document.getElementById('cc-guest-btn');
        this.ccGuestCancelMode = document.getElementById('cc-guest-cancel-mode');
    }

    init(updateProgressionUIParams) {
        this.updateProgressionUICallback = updateProgressionUIParams;

        this.setupListeners();
        this.checkSession();
    }

    setupListeners() {
        // Password Visibility Toggle
        if (this.togglePasswordBtn && this.ccPassword) {
            this.togglePasswordBtn.addEventListener('click', () => {
                if (this.ccPassword.type === 'password') {
                    this.ccPassword.type = 'text';
                    this.togglePasswordBtn.classList.add('revealed');
                    this.togglePasswordBtn.title = "Hide Password";
                } else {
                    this.ccPassword.type = 'password';
                    this.togglePasswordBtn.classList.remove('revealed');
                    this.togglePasswordBtn.title = "Dispel Illusion (Reveal Password)";
                }
            });
        }

        // Toggle Login / Register
        if (this.ccToggleMode) {
            this.ccToggleMode.addEventListener('click', (e) => {
                e.preventDefault();
                this.isLoginMode = !this.isLoginMode;
                this.ccErrorMsg.innerText = '';

                if (this.isLoginMode) {
                    this.ccTitle.innerText = "MAGE RECOGNITION";
                    this.ccSubtitle.innerText = "Speak your Owl Delivery and Incantation.";
                    this.ccClassContainer.style.display = 'none';
                    this.ccNicknameContainer.style.display = 'none';
                    this.ccCreateBtn.innerText = "ENTER LIBRARY";
                    this.ccToggleMode.innerText = "I need to register a new Mage Card.";
                    this.ccEmailContainer.style.display = 'none';
                    this.ccUsernameLabel.innerText = "Owl Delivery (Email Address):";
                    this.ccUsername.placeholder = "e.g. mage@library.com";
                } else {
                    this.ccTitle.innerText = "MAGE REGISTRATION";
                    this.ccSubtitle.innerText = "Forge your identity before entering the library.";
                    this.ccClassContainer.style.display = 'flex';
                    this.ccNicknameContainer.style.display = 'flex';
                    this.ccEmailContainer.style.display = 'flex';
                    this.ccUsernameLabel.innerText = "True Name (Username):";
                    this.ccUsername.placeholder = "e.g. invoker123";
                    this.ccCreateBtn.innerText = "SEAL MAGE CARD";
                    this.ccToggleMode.innerText = "Already have a Mage Card?";
                }
            });
        }

        // Guest Mode Listeners
        if (this.ccGuestBtn && this.ccGuestCancelMode) {
            this.ccGuestBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.isGuestMode = true;
                this.ccErrorMsg.innerText = '';

                this.ccTitle.innerText = "GUEST ACCESS";
                this.ccSubtitle.innerText = "Provide a temporary Mage Title.";

                this.ccUsernameLabel.parentElement.style.display = 'none';
                this.ccEmailContainer.style.display = 'none';
                this.ccPassword.parentElement.parentElement.style.display = 'none';
                this.ccClassContainer.style.display = 'none';

                this.ccNicknameContainer.style.display = 'flex';
                this.ccName.placeholder = "e.g. Wandering Scribe";

                this.ccCreateBtn.innerText = "ENTER AS GUEST";
                this.ccGuestBtn.style.display = 'none';
                this.ccToggleMode.style.display = 'none';
                this.ccGuestCancelMode.style.display = 'block';
            });

            this.ccGuestCancelMode.addEventListener('click', (e) => {
                e.preventDefault();
                this.isGuestMode = false;
                this.ccErrorMsg.innerText = '';

                this.isLoginMode = true;
                this.ccTitle.innerText = "MAGE RECOGNITION";
                this.ccSubtitle.innerText = "Speak your Owl Delivery and Incantation.";

                this.ccUsernameLabel.parentElement.style.display = 'flex';
                this.ccPassword.parentElement.parentElement.style.display = 'flex';
                this.ccNicknameContainer.style.display = 'none';
                this.ccEmailContainer.style.display = 'none';
                this.ccClassContainer.style.display = 'none';

                this.ccCreateBtn.innerText = "ENTER LIBRARY";
                this.ccGuestBtn.style.display = 'block';
                this.ccToggleMode.style.display = 'block';
                this.ccGuestCancelMode.style.display = 'none';
            });
        }

        // Create / Setup Account Button
        this.ccCreateBtn.addEventListener('click', async () => {
            await this.handleAuthSubmit();
        });
    }

    async handleAuthSubmit() {
        const username = this.ccUsername.value.trim().toLowerCase();
        const displayName = this.ccName.value.trim();
        const password = this.ccPassword ? this.ccPassword.value : '';
        const discipline = this.ccClass ? this.ccClass.value : 'Scholar';

        if (this.isGuestMode) {
            if (!displayName) {
                if (this.ccErrorMsg) this.ccErrorMsg.innerText = "A Guest must provide a temporary Title.";
                return;
            }
            this.isGuest = true;
            this.game.stats.mageName = "Guest " + displayName;
            this.game.stats.saveProgression();

            this.ccErrorMsg.innerText = '';
            this.ccMenu.classList.add('hidden');
            this.ccMenu.classList.remove('active');
            this.startMenu.classList.remove('hidden');
            this.startMenu.classList.add('active');
            return;
        }

        if (!username) {
            if (this.ccErrorMsg) this.ccErrorMsg.innerText = "A Mage must have a True Name (Login ID).";
            return;
        }

        if (!this.isLoginMode && !displayName) {
            if (this.ccErrorMsg) this.ccErrorMsg.innerText = "A Mage must have a Title (Display Name).";
            return;
        }

        const emailToUse = this.ccEmail && this.ccEmail.value.trim() ? this.ccEmail.value.trim() : '';

        if (!this.isLoginMode && !emailToUse) {
            if (this.ccErrorMsg) this.ccErrorMsg.innerText = "Registration requires an Owl Delivery (Email Address).";
            return;
        }

        if (supabase) {
            if (!password) {
                if (this.ccErrorMsg) this.ccErrorMsg.innerText = "A Mage must provide their Secret Incantation (Password).";
                return;
            }

            this.ccCreateBtn.disabled = true;

            if (this.isLoginMode) {
                const isEmail = username.includes('@');
                let loginEmail = isEmail ? username : '';

                if (!isEmail) {
                    if (this.ccErrorMsg) this.ccErrorMsg.innerText = "To log in securely, please provide your Owl Delivery (Email) instead of your True Name.";
                    this.ccCreateBtn.disabled = false;
                    return;
                }

                const { data, error } = await supabase.auth.signInWithPassword({
                    email: loginEmail,
                    password: password,
                });

                this.ccCreateBtn.disabled = false;

                if (error) {
                    if (this.ccErrorMsg) this.ccErrorMsg.innerText = error.message;
                    return;
                }

                if (data.user && data.user.user_metadata && data.user.user_metadata.mage_title) {
                    this.game.stats.mageName = data.user.user_metadata.mage_title;
                }

            } else {
                const { data, error } = await supabase.auth.signUp({
                    email: emailToUse,
                    password: password,
                    options: {
                        data: {
                            mage_title: displayName,
                            discipline: discipline,
                            true_name: username
                        }
                    }
                });

                this.ccCreateBtn.disabled = false;

                if (error) {
                    if (error.message.toLowerCase().includes('rate limit')) {
                        console.warn("Supabase rate limit exceeded. Falling back to local profile.");
                        if (this.ccErrorMsg) this.ccErrorMsg.innerText = "The magical library is overwhelmed (Rate Limit). Granted temporary guest access.";
                        this.game.stats.mageName = displayName;
                    } else {
                        if (this.ccErrorMsg) this.ccErrorMsg.innerText = error.message;
                        return;
                    }
                } else {
                    this.game.stats.mageName = displayName;
                }
            }
        } else {
            this.game.stats.mageName = this.isLoginMode ? username : displayName;
        }

        this.game.stats.saveProgression();

        if (this.ccErrorMsg) this.ccErrorMsg.innerText = '';
        this.ccMenu.classList.add('hidden');
        this.ccMenu.classList.remove('active');

        if (this.updateProgressionUICallback) {
            this.updateProgressionUICallback();
        }

        this.startMenu.classList.remove('hidden');
        this.startMenu.classList.add('active');
    }

    showCharacterCreation() {
        this.startMenu.classList.add('hidden');
        this.startMenu.classList.remove('active');

        this.ccMenu.classList.remove('hidden');
        this.ccMenu.classList.add('active');
        this.ccUsername.focus();
    }

    async checkSession() {
        this.startMenu.classList.add('hidden');
        this.startMenu.classList.remove('active');

        if (!supabase) {
            console.warn("Supabase not configured. Bypassing auth.");
            if (!this.game.stats.mageName) {
                this.showCharacterCreation();
            } else {
                const mageAvatarBg = document.getElementById('background-mage');
                if (mageAvatarBg) {
                    mageAvatarBg.addEventListener('click', async () => {
                        if (!this.isGuest) {
                            try {
                                if (supabase) {
                                    const { data: { session } } = await supabase.auth.getSession();
                                    if (session) {
                                        this.profileUsernameUI.innerText = session.user.email;
                                        this.mageClassSelect.value = session.user.user_metadata?.discipline || 'Novice';
                                    }
                                }
                            } catch (e) { console.warn("Supabase auth check failed."); }
                        } else {
                            this.profileUsernameUI.innerText = "Wandering Guest";
                            this.mageClassSelect.value = "Novice";
                        }

                        this.profileNickname.innerText = this.game.stats.mageName || "Unknown Mage";

                        this.startMenu.classList.remove('active');
                        this.startMenu.classList.add('hidden');
                        this.profileMenu.classList.remove('hidden');
                        this.profileMenu.classList.add('active');
                    });
                }
                this.startMenu.classList.remove('hidden');
                this.startMenu.classList.add('active');
            }
            return;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
            if (session.user.user_metadata && session.user.user_metadata.mage_title) {
                this.game.stats.mageName = session.user.user_metadata.mage_title;
                this.game.stats.saveProgression();
            } else if (!this.game.stats.mageName && session.user.email) {
                this.game.stats.mageName = session.user.email.split('@')[0];
                this.game.stats.saveProgression();
            }

            const { data: profile } = await supabase.from('profiles').select('total_xp').eq('id', session.user.id).single();
            if (profile) {
                this.game.stats.totalXP = profile.total_xp || 0;
                this.game.stats.playerLevel = Math.floor(Math.sqrt(this.game.stats.totalXP / 500)) + 1;
                this.game.stats.saveProgression();
            }

            if (this.updateProgressionUICallback) {
                this.updateProgressionUICallback();
            }

            this.startMenu.classList.remove('hidden');
            this.startMenu.classList.add('active');
        } else {
            this.showCharacterCreation();
        }
    }
}
