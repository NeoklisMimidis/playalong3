import { html, render } from "lit-html"

//configuring userData section
const colors = [
  "#30bced",
  "#6eeb83",
  "#ffbc42",
  "#ecd444",
  "#ee6352",
  "#9ac2c9",
  "#8acb88",
  "#1be7ff",
];

const oneOf = (array) => array[Math.floor(Math.random() * array.length)];

export const userData = {
  name: userParam,
  id: idParam,
  color: oneOf(colors),
  imageSrc: setUserImageUrl(),
};

export function setUserImageUrl(id = idParam) {
  const path = id
    ? `lms/user/pix.php/${id}/f1.jpg`
    : "apprepository/playalong-collab/defaultUser.svg";
  return new URL(path, `https://musicolab.hmu.gr`).toString();
}

export let userListTemplate = (users) => {
  return html`
    <ul class="user-connection-status-list">
      ${users.map(user => onlineUserTemplate(user))}
    </ul>`;
};

let onlineUserTemplate = (user) => {
  return html`<li
    class="user-connection-status-item"
    >
      <img
        src=${user.imageSrc}
        alt=${user.name}
        width="55"
        height="55"
        style="border-radius: 50%;"
      />
      <span class=${user.status == "online" ? "online-status" : "offline-status"}></span>
      <span style="color:white;">${user.name}</span>
    </li>`;
};

export const renderUserList = (users) => {
  const onlineUsersContainer = document.getElementById(
    'users-online'
  );
  if (onlineUsersContainer) {
    render(html`${userListTemplate(users)}`,
      onlineUsersContainer);
  }
}