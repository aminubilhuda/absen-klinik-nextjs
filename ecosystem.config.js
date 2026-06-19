module.exports = {
  apps: [{
    name: "absen-klinik",
    script: "npm",
    args: "start",
    env: {
      PORT: 3001,
      TZ: "Asia/Jakarta",
    },
    cwd: "/www/wwwroot/absen-klinik.minu.my.id",
  }],
};
