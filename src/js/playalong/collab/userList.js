import { html, render } from "lit-html"

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