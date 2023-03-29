import Vue from 'vue';


class Store {
    constructor() {
        this.state = {
            user: null,
            config: null,
            module: null,

            categories: [],
            
            extra: {}
        };

        // Event bus
        this.bus = new Vue();

        this.urls = {

        };
    }

    bootstrap(data) {
        ['categories', 'extra', 'user', 'config', 'module'].forEach(k => {
            if (data[k]) {
                this.state[k] = data[k];
            }
        });

        if (data.urls) {
            this.urls = data.urls;
        }
    }

    urlFor(route, args = []) {
        if (!(route in this.urls)) {
            return '';
        }

        let url = this.urls[route];

        url.match(/ARG\d/g).forEach((_, idx) => {
            url = url.replace('ARG' + idx, idx in args ? args[idx] : '');
        });

        return url;
    }
}


const storeInstance = new Store();
export default storeInstance;
