const Fingerprint2 = require('fingerprintjs2/dist/fingerprint2.min.js');


if (window.SM_AFFILIATE_OPTIONS) {
    new Fingerprint2().get(function(result, components){
        let data = {
            id: result
        };

        if (window.SM_AFFILIATE_OPTIONS) {
            data.url = SM_AFFILIATE_OPTIONS.url;
            data.referer_url = SM_AFFILIATE_OPTIONS.referer_url;
        }

        let xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/affiliate', true);
        xhr.setRequestHeader('Content-type', 'application/json');
        xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        
        xhr.send(JSON.stringify(data));

        // We don't care too much if something is wrong with request
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                if (window.SM_AFFILIATE_LINK_URL) {
                    delayedRedirect(window.SM_AFFILIATE_LINK_URL);
                }
            }
        };
    });
} else if (window.SM_AFFILIATE_LINK_URL) {
    // Do not run fingerprinting process, just redirect user
    // This can happen when link is opened without ?agent (or ?referer) parameter

    delayedRedirect(window.SM_AFFILIATE_LINK_URL);
}


function delayedRedirect(url) {
    setTimeout(() => location.href = url, 1);
}
