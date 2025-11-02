const mapCenter = new google.maps.LatLng(-37.8201657, 144.9587475);

function initialize() {
  const mapOptions = {
    center: mapCenter,
    scrollwheel: false,
    zoom: 8,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };

  new google.maps.Map(document.getElementById('map-inner'), mapOptions);
}

google.maps.event.addDomListener(window, 'load', initialize);
