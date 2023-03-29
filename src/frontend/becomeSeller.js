import Vue from 'vue';
import VueFileUpload from 'vue-upload-component';
import axios from 'axios';
import vSelect from 'vue-select';

import storeInstance from './store';


const becomeSellerApp = new Vue({
    components: {
        vSelect,
        FileUpload: VueFileUpload
    },
    data: {
        sharedState: storeInstance.state,

        newPhotoURL: null,

        photoUploading: false,
        photoUpload: {},
        photoUploadEvents: {},

        languages: [],
        skills: [],

        showAddLanguage: false,
        addLanguageLoading: false,
        addLanguageError: null,
        addLanguageSelected: '',
        addLanguageLevelSelected: '',
        addLanguageOptions: [],
        addLanguageLevelOptions: [],

        showAddSkill: false,
        addSkillLoading: false,
        addSkillError: null,
        addSkillSelected: '',
        addSkillLevelSelected: '',
        addSkillOptions: [],
        addSkillLevelOptions: [],

        phoneNumber: '',
        phoneNumberCountry: '-1',
        phoneNumberCode: '',
        phoneNumberValid: false,
        phoneNumberError: null,

        verifyingPhoneNumber: false,
        verifyingPhoneNumberCode: false,
        verifyingPhoneNumberCompleted: false,
        verifyingPhoneNumberResend: false,

        loading: false,
        error: null,

        validationErrors: {},
        validationErrorsList: []
    },
    mounted: function() {
        this.languages = this.sharedState.extra.user_languages;
        this.skills = this.sharedState.extra.user_skills;

        this.photoUploadEvents = {
            add: this.handlePhotoUploadAdd.bind(this),
            after: this.handlePhotoUploadAfter.bind(this)
        };

        this.$watch('phoneNumber', newPhoneNumber => {
            this.phoneNumberValid = (newPhoneNumber.length > 7 && /^\d+$/.test(newPhoneNumber)) && this.phoneNumberCountry !== '-1';
        });

        this.$watch('showAddLanguage', show => {
            if (!show) {
                return;
            }

            this.addLanguageError = null;
            this.addLanguageSelected = '';
            this.addLanguageLevelSelected = '';
            this.loadLanguageOptions();
        });

        this.$watch('showAddSkill', show => {
            if (!show) {
                return;
            }

            this.addSkillError = null;
            this.addSkillSelected = '';
            this.addSkillLevelSelected = '';
            this.loadSkillOptions();
        });
    },
    methods: {
        handlePhotoUploadAdd: function(file, component) {
            this.photoUploading = true;
            component.active = true;
        },
        handlePhotoUploadAfter: function(file, component) {
            this.photoUploading = false;

            if (file.error || !file.response) {
                component.remove(file.id);
                return;
            }

            this.newPhotoURL = file.response._photo_url;
        },
        handleResendClick: function() {
            this.verifyingPhoneNumberCode = false;
            this.verifyingPhoneNumberResend = false;
            this.handleVerifyClick();
        },
        handleVerifyClick: function() {
            let countryCode = this.phoneNumberCountry.split(',')[1];

            if (!countryCode) {
                return;
            }

            this.verifyingPhoneNumber = true;

            let data = {
                phone_number: countryCode + this.phoneNumber
            };

            if (this.verifyingPhoneNumberCode) {
                if (!this.phoneNumberCode) {
                    return;
                }

                data.code = this.phoneNumberCode;
            }

            this.loading = true;
            this.phoneNumberError = null;
            axios.post('/api/account/settings/phone_number', data).then(res => {
                this.loading = false;

                if (data.code) {
                    this.verifyingPhoneNumberCompleted = true;
                } else {
                    this.verifyingPhoneNumberCode = true;
                    setTimeout(() => {
                        if (!this.verifyingPhoneNumberCompleted) {
                            this.verifyingPhoneNumberResend = true;
                        }
                    }, 120000);
                }
            }).catch(res => {
                this.loading = false;

                if (res.response.status === 400) {
                    if (data.code) {
                        this.phoneNumberError = 'Security code is incorrect';
                    } else {
                        this.verifyingPhoneNumber = false;
                        this.phoneNumberError = 'Please check that you are entering correct phone number';
                    }
                } else if (res.response.status === 409) {
                    this.phoneNumberError = 'This phone number already bound to another account';
                } else if (res.response.status === 429) {
                    this.phoneNumberError = 'You are trying to request verification code too often. Please wait 1-2 minutes';
                } else {
                    this.verifyingPhoneNumber = false;
                    this.phoneNumberError = 'We are unable to fulfill your request at the moment, please try again later';
                }
            });
        },
        handleContinueClick: function() {
            let data = {
                description: this.sharedState.extra.description,
                languages: this.languages.map(lang => ({ id: lang.id, level_id: lang.level_id })),
                skills: this.skills.map(skill => ({ id: skill.id, level_id: skill.level_id }))
            };

            this.loading = true;
            axios.post('/api/become_seller', data).then(res => {
                location.href = res.data._url;
            }).catch(res => {
                this.loading = false;
                if (res.response.status === 400) {
                    this.error = 'Please fill in required fields in order to proceed';

                    if (res.response.data && res.response.data.error && res.response.data.error.fields) {
                        this.validationErrors = res.response.data.error.fields;
                        this.validationErrorsList = Object.keys(res.response.data.error.fields).map(key => {
                            if (key === 'description') {
                                return 'Description should contain 120-1000 characters';
                            }
                            if (key === 'photo') {
                                return 'Photo is missing';
                            }
                            if (key === 'phone_number') {
                                return 'Phone number is not verified';
                            }
                            if (key === 'languages') {
                                // This acutally means that JSON object is wrong for languages
                                return 'Select at least one language';
                            }
                            if (key === 'skills') {
                                // This acutally means that JSON object is wrong for skills
                                return 'Error updating skills';
                            }
                        });
                    }
                } else {
                    this.error = 'We are unable to fulfill your request at the moment, please try again later';
                }
            });
        },

        handleLanguageItemRemove: function(item, idx) {
            this.languages.splice(idx, 1);
        },

        handleSkillItemRemove: function(item, idx) {
            this.skills.splice(idx, 1);
        },

        handleAddLanguage: function() {
            for (let language of this.languages) {
                if (language.id === this.addLanguageSelected[0]) {
                    this.addLanguageError = 'You\'ve already added this language';
                    return;
                }
            }

            this.languages.push({
                id: this.addLanguageSelected[0],
                title: this.addLanguageSelected[1],
                level_id: this.addLanguageLevelSelected[0],
                level: this.addLanguageLevelSelected[1]
            });

            this.showAddLanguage = false;
        },

        handleAddSkill: function() {
            for (let skill of this.skills) {
                if (skill.id === this.addSkillSelected[0]) {
                    this.addSkillError = 'You\'ve already added this skill';
                    return;
                }
            }

            this.skills.push({
                id: this.addSkillSelected[0],
                title: this.addSkillSelected[1],
                level_id: this.addSkillLevelSelected[0],
                level: this.addSkillLevelSelected[1]
            });

            this.showAddSkill = false;
        },

        loadLanguageOptions: function() {
            if (this.addLanguageOptions.length) {
                return;
            }

            this.addLanguageLoading = true;
            axios.get('/api/become_seller/languages').then(res => {
                this.addLanguageLoading = false;
                this.addLanguageOptions = res.data.languages;
                this.addLanguageLevelOptions = res.data.levels;
            });
        },

        loadSkillOptions: function() {
            if (this.addSkillOptions.length) {
                return;
            }

            this.addSkillLoading = true;
            axios.get('/api/become_seller/skills').then(res => {
                this.addSkillLoading = false;
                this.addSkillOptions = res.data.skills;
                this.addSkillLevelOptions = res.data.levels;
            });
        }      
    }
});

export default becomeSellerApp;
