export enum HAlignSide {
   Left = 'Left',
   Right = 'Right',
   Center = 'Center',
}

export const xAlternativeSide = {
   [HAlignSide.Left]: HAlignSide.Right,
   [HAlignSide.Right]: HAlignSide.Left,
   [HAlignSide.Center]: HAlignSide.Left,
};
