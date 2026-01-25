export const chance = (percent) => {
  return Math.random() * 100 < percent;
};

export const pickRandom = (arr) => {
  return arr[Math.floor(Math.random() * arr.length)];
};
