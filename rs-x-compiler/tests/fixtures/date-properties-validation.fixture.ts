import { rsx } from '@rs-x/expression-parser';

interface Model {
  invoiceDate: Date;
}

declare const model: Model;

rsx('invoiceDate.year')(model);
rsx('invoiceDate.utcYear')(model);
rsx('invoiceDate.month')(model);
rsx('invoiceDate.utcMonth')(model);
rsx('invoiceDate.date')(model);
rsx('invoiceDate.utcDate')(model);
rsx('invoiceDate.hours')(model);
rsx('invoiceDate.utcHours')(model);
rsx('invoiceDate.minutes')(model);
rsx('invoiceDate.utcMinutes')(model);
rsx('invoiceDate.seconds')(model);
rsx('invoiceDate.utcSeconds')(model);
rsx('invoiceDate.milliseconds')(model);
rsx('invoiceDate.utcMilliseconds')(model);
rsx('invoiceDate.time')(model);
