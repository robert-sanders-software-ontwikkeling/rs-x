import { enableProdMode, isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

import { providexRsx } from '@rs-x/angular';

import { AppComponent } from './app/app.component';

if (!isDevMode()) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [...providexRsx()],
}).catch((error) => {
  console.error(error);
});
