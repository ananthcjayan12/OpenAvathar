export const isMobile = () => {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
};

export const canShare = () => {
    return typeof navigator.share !== 'undefined';
};
