import $ from "jquery";

const getCookie = (cname: string) => {
  var name = cname + "=";
  var decodedCookie = decodeURIComponent(document.cookie);
  var ca = decodedCookie.split(";");
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == " ") {
      c = c.substring(1);
    }
    if (c.indexOf(name) == 0) {
      return c.substring(name.length, c.length);
    }
  }
  return "";
};

export const refreshToken = () => {
  setInterval(() => {
    $.ajax({
      type: "POST",
      url: "/token",
      data: {
        refreshToken: getCookie("refreshJwt"),
      },
      success: (data) => {},
      error: (xhr) => {
        console.log("Disconnected");
        location.reload();
      },
    });
  }, 10000);
};
