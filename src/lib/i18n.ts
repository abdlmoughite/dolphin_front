export const t = {
  slogan: "Tout ce qu'il vous faut, au meme endroit.",
  currency: 'MAD',
};

export const money = (value: number | string) =>
  `${Number(value || 0).toLocaleString('fr-MA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DH`;

