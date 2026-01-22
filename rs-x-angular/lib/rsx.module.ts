import { NgModule } from '@angular/core';
import { RsxPipe } from './rsx.pipe';

@NgModule({
  declarations: [RsxPipe],
  exports: [RsxPipe]
})
export class RsxModule {}