# Web UI Core

Web UI core provide the base library for creating web components. Implementing web component from scratch using the native web browser api is not an easy task. Problems you have to solve:

* You have to implement data binding. Surprisingly browsers don't have native support for databinding, one of the core features for implementing modern UI libraries because it enables us to seperate or presentation layer from or UI logic. It is difficult to implement this your self in a generic way. [See data binding](#databinding)
  
* Web component are often composed out of other components. For example a list component may consist of a scroll container and a scroller component. One of the problems you will encounter is that you don't have any guarantee that components will be loaded in correct order. It may depend on the order javasript files are loaded. The input properties for a component are normally bound to parent component properties. So before we can resolve a child component bindings we have to be sure that the direct or indirect parent components are loaded. The problem is that the code for the web component will not be loaded before you have called ```window.customElements.define```. So this means that ```window.customElements.define``` for the parent components has to be called before the child component. This would be very cumbersome if you constantly have to think about this and is not feasible when writing a generic UI library. This problem is solved by suspending the initalizing of the component until all its direct or indirect parents are loaded.
  
  
##  <a name="databinding"></a>Data binding

One of the trickier part of implementing data binding is change detection

There are four databinding types:

1. One time bindings. For example
   ```html
   <my-component myproperty.onetime="myvalue">
   </my-component>
    ```
    The binding is only done once. So if ```myvalue``` changes after binding the new value will not be reflected to ```myproperty```.
   
2. One way bindings. For example 
   ```html
   <my-component myproperty.oneway="myvalue">
   </my-component>
   ```
   In the above example changes for ```myvalue``` wil be reflected back to ```myproperty```.
   
3. Two way bindings. For example 
   ```html
   <my-component myproperty.twoway="myvalue">
   </my-component>
   ```
    In the above example changes for ```myvalue``` wil be reflected back to ```myproperty``` and changes in ```myproperty``` will be reflected back to ```myvalue```
   
4. One way text bindings. For example 
   ```html
   <my-component>
        [[myvalue]]
    </my-component>
   ```
   In the above example changes for ```myvalue``` wil be reflected back to ```textContent``` for the belonging text node.


Change detection is automatically enabled for inputs than means properties/fields decorated with the `Input` decorator. If you want to enable change detection for non-input properties/fields you have to decorate them with the `ObservableProperty` decorator.

In the example below items for the repeater component will automatically be rebinded when we set the items property for the application component:

```typescript
@Component({
    selector: 'tw-app',
    template: 
        `<tw-repeater items.oneway="items">
            <template>
                <table>
                    <tr>
                        <td>id</td>
                        <td>[[item.id]]</td>
                    </tr>
                    <tr>
                        <td>name</td>
                        <td>[[item.name]]</td>
                    </tr>
                </table>
            <template>
        </tw-repeater>` ,
    dependencies: [RepeaterComponent],
})
class ApplicationComponent extends WebComponent {
    @ObservableProperty()
    public items: any[] | ArrayObserver<any> = [];
}
```


##  <a name="creating-web-component"></a>Creating a web component

1. Create a new Controller that is indepedent of a specific UI framework and let it implement an interface. The advantage of this is that later on you can easily implement  suppport for another UI framework like Angular
   
2. Create a new class and derived it from WebComponent
   
3. Decorate your web component class with the `Component` decorator
   
4. In the component constructor use InjectionContainer to fetch an instance of your controller. Be aware that you can not use constructor depedency injection because the browser will instantiate your web component.
   
5. Add input fields/properties to you component by decorating them with `Input` decorator.
   
6. If you want change detection for non-input properties/fields you have to decorate them with them with `ObservableProperty` decorator
   
7. If your component has events add a readonly properties/fields with return type `Observable<>` and decorate them with the `Output` decorator. 

In the example belowe you see a code snippet for the the repeater component illustrating the above mentioned step:


```typescript
export class RepeaterController implements IRepeaterController {

}

@Component({
    selector: CustomTagName.Repeater,
    template: null,
    styles: ':host {display:none;}',
    dependencies: [DataContextComponent]
})
export class RepeaterComponent extends WebComponent  {
    private readonly _controller: IRepeaterController;

    constructor() {
        super();
        const controlFactory = InjectionContainer
            .get<IRepeaterControllerFactory>(CoreComponentTypes.IRepeaterControllerFactory);
        this._controller = controlFactory.create(this);
    }

    ...

    @Input()
    public get items(): any[] | ArrayObserver<any> {
       return this._controller.items;
    }

    public set items(value: any[] | ArrayObserver<any>) {
        this._controller.items = value;
    }

    ...

    @Output('content-changed')
    public get contentChanged(): Observable<IRepeaterContentChangeInfo> {
        return this._controller.contentChanged;
    }
}
```