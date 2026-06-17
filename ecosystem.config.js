module.exports = {
  apps: [{
    name: "absen-klinik",
    script: "npm",
    args: "start",
    env: {
      PORT: 3001,
    },
    cwd: "/www/wwwroot/absen-klinik.minu.my.id",
  }],
};
