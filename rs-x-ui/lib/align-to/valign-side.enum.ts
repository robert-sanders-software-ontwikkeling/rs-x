export enum VAlignSide {
   Top = 'Top',
   Bottom = 'Bottom',
   Center = 'Center',
}

export const yAlternativeSide = {
   [VAlignSide.Top]: VAlignSide.Bottom,
   [VAlignSide.Bottom]: VAlignSide.Top,
   [VAlignSide.Center]: VAlignSide.Top,
};
