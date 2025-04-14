// 지도 및 마커 관리 변수
let map, userMarker;
let courierMarkers = [];
let courierList = [];
let openInfoWindow = null;
let infoWindowTimer = null;

// 택배사별 마커 색상 매핑
const iconMap = {
  "CJ대한통운": "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
  "한진택배": "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_red.png",
  "대신택배": "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_yellow.png",
  "경동택배": "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker_blue.png",
  "기타": "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/marker.png"
};

// 초기 지도 로딩 및 JSON 데이터 불러오기
async function initMap() {
  map = new kakao.maps.Map(document.getElementById("map"), {
    center: new kakao.maps.LatLng(37.5665, 126.9780),
    level: 7
  });

  const res = await fetch('addressList.json');
  courierList = await res.json();
}

// 현재 위치로 검색
function useGPS() {
  if (!navigator.geolocation) return alert("이 브라우저는 GPS를 지원하지 않습니다.");
  navigator.geolocation.getCurrentPosition(pos => {
    searchNearby(pos.coords.latitude, pos.coords.longitude);
  }, () => {
    alert("위치 정보를 가져올 수 없습니다.");
  });
}

// 주소로 검색
function findNearest() {
  const address = document.getElementById("address").value;
  const titleEl = document.getElementById("resultTitle");
  if (!address.trim()) {
    titleEl.classList.remove("visible");
    return alert("주소를 입력해주세요!");
  }

  const geocoder = new kakao.maps.services.Geocoder();
  geocoder.addressSearch(address, (result, status) => {
    if (status === kakao.maps.services.Status.OK) {
      const lat = parseFloat(result[0].y);
      const lng = parseFloat(result[0].x);
      searchNearby(lat, lng);
    } else {
      titleEl.classList.remove("visible");
      alert("주소를 찾을 수 없습니다.");
    }
  });
}

// 거리 기반 검색 실행
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

  const ranked = courierList.map(c => ({
    ...c,
    distance: getDistance(userLat, userLng, c.lat, c.lng)
  }))
  .sort((a, b) => a.distance - b.distance)
  .slice(0, 10);

  titleEl.classList.add("visible");
  renderList(ranked);
  showMarkers(ranked);
  map.setCenter(userLoc);
}

// 리스트 렌더링 + 마커 연동
function renderList(items) {
  const listDiv = document.getElementById("resultList");
  listDiv.innerHTML = "";
  items.forEach((item, i) => {
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <strong>${i + 1}. 지점명: ${item.name}</strong><br>
      택배사: ${item.category}<br>
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

// 마커 표시 및 인포윈도우 설정
function showMarkers(list) {
  courierMarkers.forEach(m => m.setMap(null));
  courierMarkers = [];

  list.forEach((c, i) => {
    const icon = iconMap[c.category] || iconMap["기타"];
    const marker = new kakao.maps.Marker({
      map,
      position: new kakao.maps.LatLng(c.lat, c.lng),
      title: c.name,
      image: new kakao.maps.MarkerImage(icon, new kakao.maps.Size(32, 35), {
        offset: new kakao.maps.Point(16, 35)
      })
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

// 거리 계산 함수 (Haversine)
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
