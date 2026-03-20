import { Calculated, Input } from '@rs-x/core';
import { Bootstrapper } from '../../../lib/web-component/bootstrapper';
import { Output } from '../../../lib/web-component/decorators/output/output.decorator.function';
import { ViewChild } from '../../../lib/web-component/decorators/view-child/view-child.decorator.function';

describe('DecoratorValidatorConfiguration', () => {
   beforeAll(async () => {
      await Bootstrapper.bootstrap();
   });

   it('property with Input and Output decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Input()
            @Output()
            public oops: string;
         }
      }).toThrow(
         `Property 'oops' on Test can not be an input because it is already defined as an output`
      );
   });

   it('property with Input and Calculated decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Input()
            @Calculated()
            public get oops(): string {
               return 'hi' + 'how are you';
            }
         }
      }).toThrow(
         `Property 'oops' on Test can not be an input because it is already defined as a calculated property`
      );
   });

   it('property with Input and ViewChild decorator will thrown an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Input()
            @ViewChild('a')
            public oops: string;
         }
      }).toThrow(
         `Property 'oops' on Test can not be an input because it is already defined as a view child`
      );
   });

   it('property with Output and Input decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Output()
            @Input()
            public oops: string;
         }
      }).toThrow(
         `Property 'oops' on Test can not be an output because it is already defined as an input`
      );
   });

   it('property with Output and Calculated decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Output()
            @Calculated()
            public get oops(): string {
               return 'hi' + 'how are you';
            }
         }
      }).toThrow(
         `Property 'oops' on Test can not be an output because it is already defined as a calculated property`
      );
   });

   it('property with Output and ViewChild decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Output()
            @ViewChild('a')
            public oops: string;
         }
      }).toThrow(
         `Property 'oops' on Test can not be an output because it is already defined as a view child`
      );
   });

   it('property with Calculated and Input decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Calculated()
            @Input()
            public get oops(): string {
               return 'hi' + 'how are you';
            }
         }
      }).toThrow(
         `Property 'oops' on Test can not be a calculated property because it is already defined as an input`
      );
   });

   it('property with Calculated and Output decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Calculated()
            @Output()
            public get oops(): string {
               return 'hi' + 'how are you';
            }
         }
      }).toThrow(
         `Property 'oops' on Test can not be a calculated property because it is already defined as an output`
      );
   });

   it('property with Calculated and ViewChild decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @Calculated()
            @ViewChild('a')
            public get oops(): string {
               return 'hi' + 'how are you';
            }
         }
      }).toThrow(
         `Property 'oops' on Test can not be a calculated property because it is already defined as a view child`
      );
   });

   it('property with ViewChild and Input decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @ViewChild('a')
            @Input()
            public oops: string;
         }
      }).toThrow(
         `Property 'oops' on Test can not be a view child because it is already defined as an input`
      );
   });

   it('property with ViewChild and Output decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @ViewChild('a')
            @Output()
            public oops: string;
         }
      }).toThrow(
         `Property 'oops' on Test can not be a view child because it is already defined as an output`
      );
   });

   it('property with ViewChild and Calculated decorator will throw an exception', () => {
      expect(() => {
         // eslint-disable-next-line @typescript-eslint/no-unused-vars
         class Test {
            @ViewChild('a')
            @Calculated()
            public get oops(): string {
               return 'hi' + 'how are you';
            }
         }
      }).toThrow(
         `Property 'oops' on Test can not be a view child because it is already defined as a calculated property`
      );
   });
});
