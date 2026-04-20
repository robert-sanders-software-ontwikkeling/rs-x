import * as rxjs from 'rxjs';

import { rsx } from '@rs-x/expression-parser';

const model = {
  count: 1,
  subjectNumber: new rxjs.BehaviorSubject(20),
  subjectNumberExplicit: new rxjs.BehaviorSubject<number>(20),
  nestedSubject: new rxjs.BehaviorSubject({
    y: new rxjs.BehaviorSubject({
      z: 10,
    }),
  }),
};

rsx('subjectNumber + 1')(model);
rsx('subjectNumberExplicit + 1')(model);
rsx('nestedSubject.y.z + count')(model);
