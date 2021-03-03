
var TESTING = false;

var popupRestaurantTemplate;
var popupDeliveryServiceTemplate;
var sopasPopupContent;
var deviceType = "empty";
var numberFormater = new Intl.NumberFormat('pt-PT', { maximumSignificantDigits: 5 });

function IsiOS() {
    return [
        'iPad Simulator',
        'iPhone Simulator',
        'iPod Simulator',
        'iPad',
        'iPhone',
        'iPod'
    ].includes(navigator.platform)
        // iPad on iOS 13 detection
        || (navigator.userAgent.includes("Mac") && "ontouchend" in document)
}

function IsAndroid() {
    return (/(android)/i.test(navigator.userAgent)) || /(android)/i.test(navigator.platform);
}

function GetDeviceType() {
    var res = "web";
    if (IsAndroid()) {
        res = "android";
    }
    else if (IsiOS()) {
        res = "ios";
    }
    return res;
}

function IsNotNullOrEmpty(text) {
    return text && String(text).length !== 0;
}

function SplitString(text) {
    var list = text.split(",");
    return list.map(function (e) {
        return e.trim();
    });
}

function phoneReplacer(match, p1, p2, p3, p4, p5, p6, offset, string) {
    var result = [p4, p5, p6].join('-');
    if (p1 && p1.length !== 0) {
        result = [p1, result].join('-');
    }
    return result;
}

function FormatPhoneNumber(text) {
    if (!IsNotNullOrEmpty(text)) return null;
    return String(text).replace(/\s/g, '').replace(/((\+|00)(\d{3}))?(\d{3})(\d{3})(\d{3})/, '$4 $5 $6');
}

function FormatPhoneNumberURL(text) {
    if (!IsNotNullOrEmpty(text)) return null;
    return String(text).replace(/\s/g, '').replace(/((\+|00)(\d{3}))?(\d{3})(\d{3})(\d{3})/, phoneReplacer);
}


document.addEventListener("DOMContentLoaded", (event) => {
    popupRestaurantTemplate = document.getElementById('popup-restaurant-template').innerHTML;
    popupDeliveryServiceTemplate = document.getElementById('popup-deliveryservice-template').innerHTML;

    sopasPopupContent = document.getElementById('sopas-popup-content');

    deviceType = GetDeviceType();
});

mapboxgl.accessToken = 'pk.eyJ1IjoicmljYXJkb2Vwcm9kcmlndWVzIiwiYSI6ImNra3JoM2M0dDAzbXYybnA2cWlnNzQ1NmsifQ.wSNvYjHSceafKy-fPUb-yg'; // replace this with your access token

var style = 'mapbox://styles/ricardoeprodrigues/ckks90f7e0wrp17o5zb2vj7yo';
if (TESTING) {
    style = 'mapbox://styles/ricardoeprodrigues/cklpidy614ygp17npgmk5kney';
}
var map = new mapboxgl.Map({
    container: 'map',
    style: style,
    center: [-8.450, 39.511],
    zoom: 5.83
});

// Add geolocate control to the map.
map.addControl(
    new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        fitBoundsOptions: {
            maxZoom: 15
        },
        trackUserLocation: true
    })
);

function onRestaurantClick(feature) {
    var latitude = feature.geometry.coordinates[1];
    var longitude = feature.geometry.coordinates[0];

    var properties = feature.properties;
    var mapurl = properties.GoogleMapsURL;
    // Check if GoogleMapsURL is defined, if not use coordinates
    if (!mapurl || mapurl.length === 0) {
        switch (deviceType) {
            case "android":
                // "google.navigation:q=" + latitude + "," + longitude;
                // "geo:0,0?q=" + latitude + "," + longitude;
                var android = "geo:0,0?q=" + latitude + "," + longitude;
                mapurl = android;
                break;

            case "ios": // fallthrough
            case "web": // fallthrough
            default:
                // "https://www.google.com/maps/dir/?api=1&destination=" + latitude + "," + longitude;
                var web = "https://www.google.com/maps/search/?api=1&query=" + latitude + "," + longitude;
                mapurl = web;
                break;
        }
    }

    var view = {
        name: properties.Name,

        showPhone: IsNotNullOrEmpty(properties.Phone),
        phone: FormatPhoneNumber(properties.Phone),
        phoneUrl: FormatPhoneNumberURL(properties.Phone),

        latitude: numberFormater.format(latitude),
        longitude: numberFormater.format(longitude),
        url: mapurl,

        showModalities: false,
        soupDonation: IsNotNullOrEmpty(properties["sopa-paga"]) && properties["sopa-paga"].toLowerCase().trim() === "sim",
        freeDonation: IsNotNullOrEmpty(properties["donativo-livre"]) && properties["donativo-livre"].toLowerCase().trim() === "sim",
        foodDonation: IsNotNullOrEmpty(properties["donativo-generos"]) && properties["donativo-generos"].toLowerCase().trim() === "sim",


        showPayments: false,
        bankTransferPayment: IsNotNullOrEmpty(properties["pagamento-transferencia"]) && properties["pagamento-transferencia"].toLowerCase().trim() === "sim",
        moneyPayment: IsNotNullOrEmpty(properties["pagamento-dinheiro"]) && properties["pagamento-dinheiro"].toLowerCase().trim() === "sim",
        multibancoPayment: IsNotNullOrEmpty(properties["pagamento-multibanco"]) && properties["pagamento-multibanco"].toLowerCase().trim() === "sim",
        mbwayPayment: IsNotNullOrEmpty(properties["pagamento-mbway"]) && properties["pagamento-mbway"].toLowerCase().trim() === "sim",
    };
    view.showModalities = view.soupDonation || view.freeDonation || view.foodDonation;
    view.showPayments = view.bankTransferPayment || view.moneyPayment || view.multibancoPayment || view.mbwayPayment;
    var rendered = Mustache.render(popupRestaurantTemplate, view);

    var popup = new mapboxgl.Popup({ offset: [0, -15], className: "popup" })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(rendered)
        .addTo(map);
}

function onDeliveryServiceClick(feature) {
    var latitude = feature.geometry.coordinates[1];
    var longitude = feature.geometry.coordinates[0];

    var properties = feature.properties;
    var url = properties.url;

    var view = {
        name: properties.Name,

        showPhone: IsNotNullOrEmpty(properties.Phone),
        phone: FormatPhoneNumber(properties.Phone),
        phoneUrl: FormatPhoneNumberURL(properties.Phone),

        latitude: numberFormater.format(latitude),
        longitude: numberFormater.format(longitude),
        url: url,

        showDistributionLocations: false,
        distributionLocations: []
    };
    // Transform the distribution zone string into an array and add to view
    var distLocText = properties["zona-distribuicao"];
    if (distLocText && IsNotNullOrEmpty(distLocText)) {
        var locations = SplitString(distLocText);
        locations.forEach(location => {
            view.distributionLocations.push({ "name": location });
        });
        if (view.distributionLocations.length > 0) {
            view.showDistributionLocations = true;
        }
    }

    var rendered = Mustache.render(popupDeliveryServiceTemplate, view);

    var popup = new mapboxgl.Popup({ offset: [0, -15], className: "popup" })
        .setLngLat(feature.geometry.coordinates)
        .setHTML(rendered)
        .addTo(map);
}

map.on('click', function (e) {
    var features = map.queryRenderedFeatures(e.point, {
        layers: ['sopaparatodos', 'sopaparatodos-domicilio'] // replace this with the name of the layer
    });

    if (!features.length) {
        return;
    }

    var feature = features[0];

    var zoom = map.getZoom();

    // check if zoom is needed to see all locations
    if (zoom < 9.5) {
        map.flyTo({
            center: feature.geometry.coordinates,
            zoom: 10,
            essential: true // this animation is considered essential with respect to prefers-reduced-motion
        });
        return;
    }

    switch (feature.layer.id) {
        case "sopaparatodos-domicilio":
            onDeliveryServiceClick(feature);
            break;
        case "sopaparatodos":
        default:
            onRestaurantClick(feature);
            break;
    }
});

function ShowInfoTemplate(templateName) {
    var template = document.getElementById(templateName).innerHTML;
    sopasPopupContent.innerHTML = Mustache.render(template, null);
    SetInfoVisibility(true);
}

function SetInfoVisibility(visibility) {
    var el = document.getElementById('popup');

    if (visibility) {
        // Open Info Popup
        el.classList.remove('hidden');
    } else {
        // Close Info Popup
        el.classList.add('hidden');
    }
}