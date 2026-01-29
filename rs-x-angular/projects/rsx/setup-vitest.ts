import { getTestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';

import 'zone.js';
import 'zone.js/testing';

// Initialize Angular TestBed environment
getTestBed().initTestEnvironment(
  BrowserTestingModule,
  platformBrowserTesting()
);