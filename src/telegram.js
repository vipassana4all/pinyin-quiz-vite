// Telegram Mini App integration
class TelegramWebApp {
    constructor() {
        // Very strict Telegram detection - only true when actually running in Telegram
        this.isInTelegram = typeof window !== 'undefined' && 
                           window.Telegram && 
                           window.Telegram.WebApp && 
                           window.Telegram.WebApp.initData && 
                           window.Telegram.WebApp.initData.length > 0 &&
                           (window.Telegram.WebApp.platform !== undefined);
        
        this.webApp = this.isInTelegram ? window.Telegram.WebApp : null;
        
        if (this.isInTelegram) {
            this.init();
        }
        
        console.log('Telegram detection:', this.isInTelegram, {
            hasWindow: typeof window !== 'undefined',
            hasTelegram: !!(window.Telegram),
            hasWebApp: !!(window.Telegram && window.Telegram.WebApp),
            hasInitData: !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData),
            initDataLength: window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData ? window.Telegram.WebApp.initData.length : 0,
            hasPlatform: !!(window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.platform)
        });
    }

    init() {
        // Initialize Telegram WebApp
        this.webApp.ready();
        
        // Expand to full height
        this.webApp.expand();
        
        // Set header color to match app theme
        this.webApp.setHeaderColor('#111827'); // gray-900
        
        // Enable closing confirmation
        this.webApp.enableClosingConfirmation();
        
        // Set main button (initially hidden)
        this.webApp.MainButton.hide();
        
        console.log('Telegram WebApp initialized');
    }

    // Theme utilities
    getThemeParams() {
        if (!this.isInTelegram) return null;
        return this.webApp.themeParams;
    }

    isDarkTheme() {
        if (!this.isInTelegram) return true; // Default to dark for web
        return this.webApp.colorScheme === 'dark';
    }

    // User info
    getUserInfo() {
        if (!this.isInTelegram) return null;
        return this.webApp.initDataUnsafe?.user || null;
    }

    // Haptic feedback
    hapticFeedback(type = 'light') {
        if (!this.isInTelegram) return;
        
        switch (type) {
            case 'light':
                this.webApp.HapticFeedback.impactOccurred('light');
                break;
            case 'medium':
                this.webApp.HapticFeedback.impactOccurred('medium');
                break;
            case 'heavy':
                this.webApp.HapticFeedback.impactOccurred('heavy');
                break;
            case 'success':
                this.webApp.HapticFeedback.notificationOccurred('success');
                break;
            case 'error':
                this.webApp.HapticFeedback.notificationOccurred('error');
                break;
            case 'warning':
                this.webApp.HapticFeedback.notificationOccurred('warning');
                break;
        }
    }

    // Main button control
    showMainButton(text, onClick) {
        if (!this.isInTelegram) return;
        
        this.webApp.MainButton.setText(text);
        this.webApp.MainButton.onClick(onClick);
        this.webApp.MainButton.show();
    }

    hideMainButton() {
        if (!this.isInTelegram) return;
        this.webApp.MainButton.hide();
    }

    // Back button control
    showBackButton(onClick) {
        if (!this.isInTelegram) return;
        
        this.webApp.BackButton.onClick(onClick);
        this.webApp.BackButton.show();
    }

    hideBackButton() {
        if (!this.isInTelegram) return;
        this.webApp.BackButton.hide();
    }

    // Close app
    close() {
        if (!this.isInTelegram) {
            // For web, just show alert
            alert('В веб-версии приложение нельзя закрыть');
            return;
        }
        this.webApp.close();
    }

    // Send data to bot (if needed)
    sendData(data) {
        if (!this.isInTelegram) return;
        this.webApp.sendData(JSON.stringify(data));
    }

    // Get viewport info
    getViewport() {
        if (!this.isInTelegram) {
            return {
                height: window.innerHeight,
                width: window.innerWidth,
                isExpanded: true
            };
        }
        
        return {
            height: this.webApp.viewportHeight,
            width: window.innerWidth,
            isExpanded: this.webApp.isExpanded
        };
    }
}

// Create singleton instance
const telegramApp = new TelegramWebApp();

export default telegramApp;