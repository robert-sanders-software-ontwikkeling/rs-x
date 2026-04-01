import { KeyedInstanceFactoryMock } from '@rs-x/core/testing';

import {
  type IWatch,
  type IWatchData,
  type IWatchFactory,
  type IWatchId,
} from '../state-manager';

export class WatchFactoryMock
  extends KeyedInstanceFactoryMock<number, IWatchData, IWatch, IWatchId>
  implements IWatchFactory {}
