import fecha from 'fecha';

import storeInstance from '../frontend/store';


export function formatTimespanFromNow(date, useDate = true) {
    date = typeof date === 'string' ? new Date(date) : date;

    let diff = +new Date() - date.getTime();

    let days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
        if (useDate) {
            return formatDateTime(date);
        } else {
            return days + ' day' + (days > 1 ? 's' : '') + ' ago';
        }
    }

    diff -=  days * (1000 * 60 * 60 * 24);

    let hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours > 0) {
        return hours + ' hour' + (hours > 1 ? 's' : '') + ' ago';
    }

    diff -= hours * (1000 * 60 * 60);

    let mins = Math.floor(diff / (1000 * 60));

    if (mins > 0) {
        return mins + ' minute' + (mins > 1 ? 's' : '') + ' ago';
    }

    return 'now';
}


export function formatDate(date) {
    return fecha.format(new Date(date), 'MMM D, YYYY');
}


export function formatDateTime(date) {
    return fecha.format(new Date(date), 'MMM D, YYYY hh:mm A');
}


export function formatTime(date) {
    return fecha.format(new Date(date), 'hh:mm A');
}


export function prepareNotification(notification) {
    notification._date_display = formatTimespanFromNow(notification.date);
    notification._notification = ''; // TODO
    notification._url = ''; // TODO

    const Types = this.sharedState.config.messaging.notificationTypes;

    switch (notification.type) {
        case Types.SELLER_NEW_ORDER:
            notification._notification = `You've got new order of ${notification.meta.service.title}`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.BUYER_ORDER_ACCEPTED:
            notification._notification = `${notification.meta.seller.username} has accepted your order of ${notification.meta.service.title}`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.BUYER_ORDER_COMPLETED:
            notification._notification = `Your order of ${notification.meta.service.title} is completed. Please leave a feedback on it`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.BUYER_ORDER_REVISION:
            notification._notification = `${notification.meta.buyer.username} has requested a revision on order of ${notification.meta.service.title}`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.BUYER_ORDER_REJECTED:
            notification._notification = `Your order of ${notification.meta.service.title} has been rejected by the provider`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.BUYER_ORDER_SENT:
            notification._notification = `${notification.meta.seller.username} has finished working on your order of ${notification.meta.service.title}`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.SELLER_ORDER_COMPLETED:
            notification._notification = `${notification.meta.seller.username} has closed order #${notification.meta.order.id} of ${notification.meta.service.title}. Please leave a feedback on your customer`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.SELLER_ORDER_CANCELLED:
            notification._notification = `Order #${notification.meta.order.id} of ${notification.meta.service.title} has been cancelled`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.SELLER_ORDER_DISPUTE:
            notification._notification = `${notification.meta.buyer.username} has initiated resolution process on order #${notification.meta.order.id} of ${notification.meta.service.title}`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.BUYER_ORDER_DISPUTE:
            notification._notification = `${notification.meta.seller.username} has initiated resolution process on order #${notification.meta.order.id} of ${notification.meta.service.title}`;
            notification._url = storeInstance.urlFor('order', [notification.meta.order.id]);
            break;

        case Types.NEW_MESSAGE:
            notification._notification = `You've got new message for order #${notification.meta.entityId}`;
            if (notification.meta.type === 'order') {
                notification._url = storeInstance.urlFor('order', [notification.meta.entityId]);
            }
            break;
    }

    return notification;
}


export function runSmoothScrolling(elementY, duration) { 
    let startingY = window.pageYOffset,
        diff = elementY - startingY,
        start;

    window.requestAnimationFrame(function step(timestamp) {
        if (!start) {
            start = timestamp;
        }
        let time = timestamp - start,
            percent = Math.min(time / duration, 1);

        percent = (--percent)*percent*percent+1; // Apply easeOutCubic transition

        window.scrollTo(0, startingY + diff * percent);

        if (time < duration) {
          window.requestAnimationFrame(step);
        }
    });
}


export function parseQueryString() {
    let params = {};

    window.location.search.slice(1).split('&').forEach(param => {
        let expr = param.split('=');
        if (expr.length !== 2) {
            return;
        }

        params[expr[0]] = decodeURIComponent(expr[1]);
    });

    return params;
}


export function parseHashString() {
    let params = {};

    if (window.location.hash.slice(0, 2) !== '#?') {
        return params;
    }

    window.location.hash.slice(2).split('&').forEach(param => {
        let expr = param.split('=');
        if (expr.length !== 2) {
            return;
        }

        params[expr[0]] = decodeURIComponent(expr[1]);
    });

    return params;
}


export function checkPatterns(str) {

    let phoneRegx= /(?:(?:\+?1\s*(?:[.-]\s*)?)?(?:\(\s*([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9])\s*\)|([2-9]1[02-9]|[2-9][02-8]1|[2-9][02-8][02-9]))\s*(?:[.-]\s*)?)?([2-9]1[02-9]|[2-9][02-9]1|[2-9][02-9]{2})\s*(?:[.-]\s*)?([0-9]{4})(?:\s*(?:#|x\.?|ext\.?|extension)\s*(\d+))?/img,
        emailRegx = /(\".*\"|[A-Za-z]\w*)@(\[\d{1,3}(\.\d{1,3}){3}]|[A-Za-z]\w*(\.[A-Za-z]\w*)+)/,
        domainRegx= "[A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+";
    
    return {        
        pay: str.match(/pay/gi),
        phone: str.match(phoneRegx),        
        skype: str.match(/skype/gi),
        email: str.match(emailRegx),
        domain: str.match(domainRegx)
    };
}
