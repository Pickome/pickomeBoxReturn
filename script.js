let map, userMarker;
let courierMarkers = [];
let courierList = [];
let openInfoWindow = null;
let infoWindowTimer = null;

async function initMap() {
  map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  });

  const res = await fetch('addressList.json');
  courierList = await res.json();
}

function useGPS() {
  if (!navigator.geolocation) {
    alert("GPS를 지원하지 않는 브라우저입니다.");
    return;
  }

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    searchNearby(lat, lng);
  }, () => {
    alert("위치 정보를 가져올 수 없습니다.");
  });
}

function findNearest() {
  const address = document.getElementById("address").value;
  const titleEl = document.getElementById("resultTitle");
  if (!address.trim()) {
    titleEl.classList.remove("visible");
    return alert("주소를 입력해주세요!");
  }

  const geocoder = new kakao.maps.services.Geocoder();
  geocoder.addressSearch(address, function(result, status) {
    if (status === kakao.maps.services.Status.OK) {
      const userLat = parseFloat(result[0].y);
      const userLng = parseFloat(result[0].x);
      searchNearby(userLat, userLng);
    } else {
      titleEl.classList.remove("visible");
      alert("주소를 찾을 수 없습니다.");
    }
  });
}

function searchNearby(userLat, userLng) {
  const userLoc = new kakao.maps.LatLng(userLat, userLng);
  const titleEl = document.getElementById("resultTitle");

  if (userMarker) userMarker.setMap(null);

  const userIcon = new kakao.maps.MarkerImage(
    'https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png',
    new kakao.maps.Size(40, 42),
    { offset: new kakao.maps.Point(20, 42) }
  );

  userMarker = new kakao.maps.Marker({
    map,
    position: userLoc,
    title: "내 위치",
    image: userIcon
  });

  const ranked = courierList.map(c => {
    const dist = getDistance(userLat, userLng, c.lat, c.lng);
    return { ...c, distance: dist };
  }).sort((a, b) => a.distance - b.distance).slice(0, 10);

  titleEl.classList.add("visible");
  renderList(ranked);
  showMarkers(ranked);
  map.setCenter(userLoc);
}

function renderList(items) {
  const listDiv = document.getElementById("resultList");
  listDiv.innerHTML = "";
  items.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${i + 1}. 지점명: ${item.name}</strong><br>
      주소: ${item.address}<br>
      거리: ${item.distance.toFixed(2)} km
    `;
    div.onclick = () => {
      kakao.maps.event.trigger(courierMarkers[i], 'click');
      map.panTo(new kakao.maps.LatLng(item.lat, item.lng));
    };
    listDiv.appendChild(div);
  });
}

function showMarkers(list) {
  courierMarkers.forEach(m => m.setMap(null));
  courierMarkers = [];

  list.forEach((c, idx) => {
    const marker = new kakao.maps.Marker({
      map,
      position: new kakao.maps.LatLng(c.lat, c.lng),
      title: c.name
    });

    const infoWindow = new kakao.maps.InfoWindow({
      content: `<div style="padding:5px;font-size:14px;">${c.name}</div>`
    });

    kakao.maps.event.addListener(marker, 'click', () => {
      if (openInfoWindow) openInfoWindow.close();
      if (infoWindowTimer) clearTimeout(infoWindowTimer);

      infoWindow.open(map, marker);
      openInfoWindow = infoWindow;

      infoWindowTimer = setTimeout(() => {
        infoWindow.close();
        openInfoWindow = null;
      }, 3000);
    });

    courierMarkers.push(marker);
  });

  kakao.maps.event.addListener(map, 'click', () => {
    if (openInfoWindow) openInfoWindow.close();
    if (infoWindowTimer) clearTimeout(infoWindowTimer);
    openInfoWindow = null;
  });
}

function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

window.onload = initMap;
