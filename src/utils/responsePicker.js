export const pickResponse = (routeConfig) => {
  const { behavior, responses } = routeConfig;
  const roll = Math.random() * 100;

  if (roll <= behavior.successRate) {
    return {
      statusCode: responses.success.statusCode,
      body: responses.success.body,
    };
  }

  const errors = responses.errors;
  const error = errors[Math.floor(Math.random() * errors.length)];

  return {
    statusCode: error.statusCode,
    body: error.body,
  };
};
