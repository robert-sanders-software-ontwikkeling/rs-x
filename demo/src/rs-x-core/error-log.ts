import {
  type IErrorLog,
  InjectionContainer,
  printValue,
  RsXCoreInjectionTokens,
  RsXCoreModule,
  Type,
} from '@rs-x/core';

// Load the core module into the injection container
InjectionContainer.load(RsXCoreModule);
const errorLog: IErrorLog = InjectionContainer.get(
  RsXCoreInjectionTokens.IErrorLog,
);

export const run = (() => {
  const context = {
    name: 'My error context',
  };
  const changeSubscription = errorLog.error.subscribe((e) => {
    console.log('Emmitted error');
    printValue(e);
  });

  try {
    throw new Error('Oops an error');
  } catch (e) {
    errorLog.add({
      exception: Type.cast(e),
      message: 'Oops',
      context,
    });
  } finally {
    changeSubscription.unsubscribe();
  }
})();
