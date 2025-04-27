export class EmailVerificationManager {
    constructor() {
        this.verificationCode = null;
        this.pendingEmail = null;
        this.setupEventListeners();
    }

    setupEventListeners() {
        const verifyCodeBtn = document.getElementById('verifyCodeBtn');
        const cancelVerification = document.getElementById('cancelVerification');
        const resendCode = document.getElementById('resendCode');
        const verificationInput = document.getElementById('verificationCode');

        verifyCodeBtn?.addEventListener('click', () => this.verifyCode());
        cancelVerification?.addEventListener('click', () => this.hideVerificationModal());
        resendCode?.addEventListener('click', () => this.resendVerificationCode());

        // Clear any formatting as user types
        verificationInput?.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '');
        });
    }

    showVerificationModal(email) {
        const modal = document.getElementById('verificationModal');
        const verificationText = modal?.querySelector('.verification-text');
        
        this.pendingEmail = email;
        this.generateVerificationCode();

        if (verificationText) {
            verificationText.textContent = `We've sent a verification code to ${email}`;
        }

        // Clear any previous input
        const codeInput = document.getElementById('verificationCode');
        if (codeInput) {
            codeInput.value = '';
        }

        modal.style.display = 'block';
        console.log('Generated verification code:', this.verificationCode); // For testing
    }

    hideVerificationModal() {
        const modal = document.getElementById('verificationModal');
        modal.style.display = 'none';
        this.verificationCode = null;
        this.pendingEmail = null;
    }

    generateVerificationCode() {
        this.verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        // In a real application, this would be sent via email
        console.log('Verification code:', this.verificationCode);
    }

    verifyCode() {
        const inputCode = document.getElementById('verificationCode')?.value;
        console.log('Input code:', inputCode);
        console.log('Stored code:', this.verificationCode);

        if (inputCode === this.verificationCode) {
            // Store the verified status
            const users = JSON.parse(localStorage.getItem('users')) || {};
            if (users[this.pendingEmail]) {
                users[this.pendingEmail].verified = true;
                localStorage.setItem('users', JSON.stringify(users));
            }

            alert('Email verified successfully!');
            this.hideVerificationModal();

            // Trigger login if needed
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            if (!currentUser) {
                // Auto-login after verification
                const loginEvent = new CustomEvent('emailVerified', {
                    detail: { email: this.pendingEmail }
                });
                document.dispatchEvent(loginEvent);
            }
        } else {
            alert('Invalid verification code. Please try again.');
        }
    }

    resendVerificationCode() {
        if (this.pendingEmail) {
            this.generateVerificationCode();
            alert('New verification code has been sent to your email.');
            console.log('New code:', this.verificationCode); // For testing
        }
    }
}