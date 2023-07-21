// ---------- ---------- ---------- ---------- ---------- //
// C O O K I E   C O N S E N T //
// ---------- ---------- ---------- ---------- ---------- //
//
// Dieser Code bindet ein Cookie Banner ein.
// Basis des Cookie Banners ist ein kostenloses Open-Source Plugin von Github.
// More information on usage and customization on: https://github.com/orestbida/cookieconsent

// IMPORTS
import { loadAsync, loadjscss } from './utils/loadasync.mjs' 

// CUSTOM COOKIE CONSENT
// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //

export default function customCookieConsent() {
    // obtain plugin
    var cc = initCookieConsent();

    // run plugin with your configuration
    cc.run({
        current_lang: 'en',
        autoclear_cookies: true, // default: false
        page_scripts: true, // default: false

        mode: 'opt-in',                             // default: 'opt-in'; value: 'opt-in' or 'opt-out'
        // delay: 0,                               // default: 0
        // auto_language: '',                      // default: null; could also be 'browser' or 'document'
        autorun: true,                             // default: true
        // force_consent: false,                   // default: false
        hide_from_bots: false,                     // default: false
        // remove_cookie_tables: false             // default: false
        // cookie_name: 'cc_cookie',               // default: 'cc_cookie'
        // cookie_expiration: 182,                 // default: 182 (days)
        // cookie_necessary_only_expiration: 182   // default: disabled
        // cookie_domain: location.hostname,       // default: current domain
        // cookie_path: '/',                       // default: root
        // cookie_same_site: 'Lax',                // default: 'Lax'
        // use_rfc_cookie: false,                  // default: false
        // revision: 0,                            // default: 0

        onFirstAction: function(user_preferences, cookie) {
            // callback triggered only once on the first accept/reject action
            console.log('User accept type:', user_preferences.accept_type);
            console.log('User accepted these categories', user_preferences.accepted_categories)
            console.log('User reject these categories:', user_preferences.rejected_categories);
        },

        onAccept: function(cookie) {
            // callback triggered on the first accept/reject action, and after each page load
            if (cc.allowedCategory('analytics')) { 
                // callback triggered when user allows analytics
            }
        },

        onChange: function(cookie, changed_categories) {
            // callback triggered when user changes preferences after consent has already been given
        },

        languages: {
            'en': {
                consent_modal: {
                    title: 'We use cookies!',
                    description: 'Hi, this website uses essential cookies to ensure its proper operation and tracking cookies to understand how you interact with it. The latter will be set only after consent. <button type="button" data-cc="c-settings" class="cc-link">Let me choose</button>',
                    primary_btn: {
                        text: 'Accept all',
                        role: 'accept_all' // 'accept_selected' or 'accept_all'
                    },
                    secondary_btn: {
                        text: 'Reject all',
                        role: 'accept_necessary' // 'settings' or 'accept_necessary'
                    }
                },
                settings_modal: {
                    title: 'Cookie preferences',
                    save_settings_btn: 'Save settings',
                    accept_all_btn: 'Accept all',
                    reject_all_btn: 'Reject all',
                    close_btn_label: 'Close',
                    cookie_table_headers: [{
                        col1: 'Name'
                    }, {
                        col2: 'Domain'
                    }, {
                        col3: 'Expiration'
                    }, {
                        col4: 'Description'
                    }],
                    blocks: [{
                        title: 'Cookie usage',
                        description: 'I use cookies to ensure the basic functionalities of the website and to enhance your online experience. You can choose for each category to opt-in/out whenever you want. For more details relative to cookies and other sensitive data, please read the full <a href="#" class="cc-link">privacy policy</a>.'
                    }, {
                        title: 'Strictly necessary cookies',
                        description: 'These cookies are essential for the proper functioning of my website. Without these cookies, the website would not work properly',
                        toggle: {
                            value: 'necessary',
                            enabled: true,
                            readonly: true // cookie categories with readonly=true are all treated as "necessary cookies"
                        }
                    }, {
                        title: 'Performance and Analytics cookies',
                        description: 'These cookies allow the website to remember the choices you have made in the past',
                        toggle: {
                            value: 'analytics', // your cookie category
                            enabled: false,
                            readonly: false
                        },
                        cookie_table: [ // list of all expected cookies
                            {
                                col1: '^_ga', // match all cookies starting with "_ga"
                                col2: 'google.com',
                                col3: '2 years',
                                col4: 'These cookies collect information about site usage so that our services can be optimized better.',
                                is_regex: true
                            }, {
                                col1: 'Google Analytics',
                                col2: 'google.com',
                                col3: '2 years',
                                col4: 'These cookies collect information about site usage so that our services can be optimized better.',
                            }
                        ]
                    }, {
                        title: 'Advertisement and Targeting cookies',
                        description: 'These cookies collect information about how you use the website, which pages you visited and which links you clicked on. All of the data is anonymized and cannot be used to identify you',
                        toggle: {
                            value: 'targeting',
                            enabled: false,
                            readonly: false
                        }
                    }, {
                        title: 'More information',
                        description: 'For any queries in relation to our policy on cookies and your choices, please <a class="cc-link" href="#yourcontactpage">contact us</a>.',
                    }]
                }
            },

            'de': {
                consent_modal: {
                    title: 'Wir verwenden Cookies!',
                    description: 'Wir speichern und verarbeiten Ihre personenbezogenen Informationen für ein besseres Nutzungserlebnis. <button type="button" data-cc="c-settings" class="cc-link">Cookies auswählen</button>',
                    primary_btn: {
                        text: 'Alle akzeptieren',
                        role: 'accept_all' // 'accept_selected' or 'accept_all'
                    },
                    secondary_btn: {
                        text: 'Alle ablehnen',
                        role: 'accept_necessary' // 'settings' or 'accept_necessary'
                    }
                },
                settings_modal: {
                    title: 'Cookie Präferenzen',
                    save_settings_btn: 'Einstellungen speichern',
                    accept_all_btn: 'Alle akzeptieren',
                    reject_all_btn: 'Alle ablehnen',
                    close_btn_label: 'Schließen',
                    cookie_table_headers: [{
                        col1: 'Name'
                    }, {
                        col2: 'Domain'
                    }, {
                        col3: 'Ablaufdatum'
                    }, {
                        col4: 'Beschreibung'
                    }],
                    blocks: [{
                        title: 'Cookie Verwendung',
                        description: 'Wir verwenden Cookies, um die grundlegenden Funktionen der Website zu gewährleisten und Ihr Online-Erlebnis zu verbessern. Sie können Ihre Einstellungen jederzeit ändern. Für weitere Informationen zu Cookies und anderen sensiblen Daten lesen Sie bitte die <a href="https://gunther-brau.webflow.io/datenschutz" class="cc-link">Datenschutz-Erklärung</a>.'
                    }, {
                        title: 'Essenzielle Cookies',
                        description: 'Diese Cookies sind für die korrekte Funktion dieser Website unerlässlich. Sie können sie hier nicht deaktivieren, da der Dienst sonst nicht richtig funktionieren würde.',
                        toggle: {
                            value: 'essential',
                            enabled: true,
                            readonly: true // cookie categories with readonly=true are all treated as "necessary cookies"
                        },
                        cookie_table: [ // list of all expected cookies
                            {
                                col1: 'Cookie Consent Manager',
                                col2: '-',
                                col3: '2 Jahre',
                                col4: 'Speichert, welche Cookies akzeptiert wurden.'
                            }
                        ]
                    }, {
                        title: 'Performance und Analytics',
                        description: 'Diese Cookies werden auf Ihrem Gerät gespeichert. Sie speichern Einstellungen aus Ihrem letzten Besuch und helfen uns dabei das Angebot auf unserer Website zukünftig zu verbessern.',
                        toggle: {
                            value: 'analytics', // your cookie category
                            enabled: false,
                            readonly: false
                        },
                        cookie_table: [ // list of all expected cookies
                            {
                                col1: 'Google Analytics',
                                col2: 'google.com',
                                col3: '2 Jahre',
                                col4: 'Verfolgt besuche der Website, damit wir unser Angebot stetig verbessern können.'
                            }
                        ]
                    }, {
                        title: 'Werbung und Tracking Cookies',
                        description: 'Diese Dienste verarbeiten persönliche Informationen, um Ihnen personalisierte oder interessenbezogene Werbung zu zeigen.',
                        toggle: {
                            value: 'ads',
                            enabled: false,
                            readonly: false
                        },
                        cookie_table: [ // list of all expected cookies
                            {
                                col1: 'Google Analytics',
                                col2: 'google.com',
                                col3: '2 Jahre',
                                col4: 'Verfolgt besuche der Website, damit wir unser Angebot stetig verbessern können.'
                            }
                        ]
                    }, {
                        title: 'Mehr Informationen',
                        description: 'Für Fragen zu unserer Website oder den Daten, die wir erheben <a class="cc-link" href="https://gunther-brau.webflow.io/kontakt">kontaktieren Sie uns</a>.',
                    }]
                }
            }
        }
    });
}

// LOAD COOKIE CONSENT ASYNC
// ----- ----- ----- ----- ----- ----- ----- ----- ----- ----- //
// load and execute the script at the given path
loadAsync('https://cdn.jsdelivr.net/gh/orestbida/cookieconsent@v2.9.1/dist/cookieconsent.js', function() {
    // the callback runs after the script is loaded
    customCookieConsent();
});