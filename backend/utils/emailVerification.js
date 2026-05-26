export const isUserEmailVerified = (user) => Boolean(user?.isVerified === true);

export const verificationStateFor = (user) => {
  const isVerified = isUserEmailVerified(user);
  return {
    isVerified,
    isEmailVerified: isVerified,
    requiresVerification: !isVerified,
  };
};

export const markUserEmailVerified = (user) => {
  user.isVerified = true;
};
