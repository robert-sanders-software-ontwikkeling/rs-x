import { Inject, Injectable, InjectionContainer } from '@rs-x/core';
import { RsXCoreUIModule } from '../rs-x-ui.module';
import { RsXUIInjectionTokens } from '../rx-x-ui.injection-tokens';
import { IDecoratorValidationMetadata } from './decorators/decorator-validator.interface';
import { IDecoratorValidatorConfiguration } from './decorators/decorator-validator-configuration.interface';
import { inputKey } from './decorators/input/input.decorator.key';
import { outputKey } from './decorators/output/output.decorator.key';
import { viewchildKey } from './decorators/view-child/view-child.decorator.key';
import {
   IApplicationConfig,
   IBootstrapper,
   IComponentRegistry,
   IRegisteredComponents,
} from './interfaces';

@Injectable()
export class Bootstrapper implements IBootstrapper {
   private _isBootstrapped = false;
   private readonly _registered = new WeakSet();
   private readonly defaultDecoratorValidatorConfig: IDecoratorValidationMetadata[] =
      [
         {
            decoratorKey: inputKey,
            name: 'an input',
            forbiddenDecoratorKeys: [outputKey, viewchildKey],
         },
         {
            decoratorKey: outputKey,
            name: 'an output',
            forbiddenDecoratorKeys: [inputKey, viewchildKey],
         },
         {
            decoratorKey: viewchildKey,
            name: 'a view child',
            forbiddenDecoratorKeys: [inputKey, outputKey],
         },
      ];

   constructor(
      @Inject(RsXUIInjectionTokens.IComponentRegistry)
      private readonly _registry: IComponentRegistry,
      @Inject(RsXUIInjectionTokens.IRegisteredComponents)
      private readonly _registeredComponents: IRegisteredComponents,
      @Inject(RsXUIInjectionTokens.IDecoratorValidatorConfiguration)
      private readonly _decoratorValidatorConfiguration: IDecoratorValidatorConfiguration
   ) {}

   public static async bootstrap(config?: IApplicationConfig): Promise<void> {
      (await Bootstrapper.getBootstrapper()).bootstrap(config);
   }

   public static async registerWebComponents(): Promise<void> {
      (await Bootstrapper.getBootstrapper()).registerWebComponents();
   }

   public async bootstrap(config?: IApplicationConfig): Promise<void> {
      if (this._isBootstrapped) {
         return;
      }
      this._isBootstrapped = true;

      this._decoratorValidatorConfiguration.configure(
         config?.decoratorValidationConfig ??
            this.defaultDecoratorValidatorConfig
      );
      if (config?.modules && config.modules.length > 0) {
         await InjectionContainer.load(...config.modules);
      }

      this.registerWebComponents();
   }

   public registerWebComponents(): void {
      this._registeredComponents.components
         .filter((keyValue) => !this._registered.has(keyValue[0]))
         .forEach((keyValue) => {
            this._registry.registerWebComponent(
               keyValue[1].selector,
               keyValue[1].template,
               keyValue[1].styles!,
               keyValue[0],
               keyValue[1].controllerFactoryToken!
            );
            this._registered.add(keyValue[0]);
         });
   }

   private static async getBootstrapper(): Promise<IBootstrapper> {
      if (!InjectionContainer.isBound(RsXUIInjectionTokens.IBootstrapper)) {
         await InjectionContainer.load(RsXCoreUIModule);
      }
      return InjectionContainer.get<IBootstrapper>(
         RsXUIInjectionTokens.IBootstrapper
      );
   }
}
