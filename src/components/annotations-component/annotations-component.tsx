import { Component, Prop, Element, State, Listen, Event, EventEmitter} from '@stencil/core';

import { getAnnotationServiceUrl, searchAnnotations, addAnnotations, deleteAnnotations } from '@esri/hub-annotations';
export interface IResourceObject {
  id: string;
  type: "annotations" | "users";
  attributes: {
    [key: string]: any;
  };
}

function formatDate(date) {
  return new Date(date).toLocaleString();
}

@Component({
  tag: 'annotations-component',
  styleUrl: 'annotations-component.css',
  shadow: true
})


export class AnnotationsComponent {

  textInput: HTMLInputElement;

  @Element() el: HTMLElement;
  @Prop() org: string;
  @Prop({ mutable: true }) target: string;
  @Prop({ mutable: true }) author: string;
  @Prop() search: string;
  @Prop({ mutable: true }) portalUrl: string;
  @Prop({ mutable: true }) annotationsUrl: string;
  @Prop() update: boolean; // Automatic updates
  @State() annotations: IResourceObject[]
  @State() authors: any;
  @State() annotationDescription: string;
  @State() searchOptions: any;

  // Component Events
  @Event() eventAddAnnotation: EventEmitter;

  @Listen('add-annotation')
  handleEvent(e) {
    console.log('Event: add-annotation', e);
    this.addAnnotation(e.details.annotation);
  }

  // Component Methods
  constructor() {
    this.portalUrl = 'https://www.arcgis.com';
    this.authors = {}
    this.searchOptions = {} //author: this.authorSearch};

  }

  componentWillLoad() {

    if(this.search !== null || this.search !== undefined) {
      this.searchOptions.search = this.search;
    }

    if(this.author === null || this.author === undefined) {
      this.author = 'aturner';
    } else {
      this.searchOptions.author = this.author;
    }

    if(this.target === null || this.target === undefined) {
      this.target = "";
    } else {
      this.searchOptions.target = this.target;
    }

    if(this.update) {
      setInterval(() => {
        this.updateAnnotations(this.searchOptions)
      }, 1000)
    }
    return getAnnotationServiceUrl(this.org).then( annotationsUrl => {
      this.annotationsUrl = annotationsUrl + '/0';
      return this.updateAnnotations(this.searchOptions);
    });
  }

  // Retrieve annotations from service and create combined list
  updateAnnotations(options) {
    return this.getAnnotations(options).then(response => {
      // console.log("Annotations", response)
      this.annotations = response.data;

      // Append the authors index
      for (let i:number =0 ;i< response.included.length;i++) {
        if(this.authors[response.included[i].id] === undefined) {
          this.authors[response.included[i].id] = response.included[i].attributes;
        }
      }
    })
  }

  deleteAnnotation(annotationId) {
    console.log("deleteAnnotations", annotationId);
    deleteAnnotations({url: this.annotationsUrl, deletes: [ annotationId ] })
    .then( response => {
        console.log("deleteAnnotations", response);
        return this.updateAnnotations(this.searchOptions);
    });
  }
  getAnnotations(search) {
    let query = [];
    if(search === undefined || search === null) {
      search = {}
    }

    if(search.author) {
      query.push(`author LIKE '${search.author}'`)
    }
    if(search.target) {
      query.push(`target LIKE '${search.target}'`)
    }
    if(search.search) {
      query.push(search.search)
    }
    // console.log("Search", search)
    return searchAnnotations({url: this.annotationsUrl, params: {where: query.join(" AND ")}})
  }

  searchChanged(event) {
    this.searchOptions.author = event.target.value;
    return this.updateAnnotations(this.searchOptions);
  }

  getElementById(id) {
    // "annotation-header"
    for (let i:number =0 ;i< this.el.childElementCount;i++) {
      let elId = this.el.children[i].getAttribute('id');
      if(elId == id) {
        return this.el.children[i];
      }
    }
    return null;
  }

  addEvent(event) {
    event.preventDefault();
    this.addAnnotation({ attributes: {
                      author: this.author,
                      source: window.location.href,
                      target: this.target,
                      description: this.textInput.value
                    }});
  }

  addAnnotation(newAnnotation) {
    return addAnnotations({url: this.annotationsUrl, adds: [
        newAnnotation
      ]}).then( (/*response*/) => {
        this.updateAnnotations(this.searchOptions);
        this.eventAddAnnotation.emit(newAnnotation);
        // console.log("addAnnotations", response)
    });
  }

  removeAnnotation(event) {
    console.log("removeAnnotation", [event.target.id, event])
  }

  authorName(username) {
    if(this.authors[username] !== undefined) {
      return this.authors[username].fullName;
    } else {
      return username;
    }
  }
  authorImage(username) {
    if(this.authors[username] !== undefined && this.authors[username].thumbnail !== null) {
      return this.portalUrl + '/sharing/rest/community/users/' + username + '/info/' + this.authors[username].thumbnail;
    } else {
      return "https://cdn-a.arcgis.com/cdn/18397E9/js/arcgisonline/css/images/no-user-thumb.jpg";
    }
  }

  render() {
    let output = []
    let headerEl = this.getElementById("annotation-header");
    var header = "Comments"
    if(headerEl !== null) {
      header = headerEl.innerHTML; //output.push(<div innerHTML={header.innerHTML}></div>);
    }

    output.push(
      <div class="headind_srch">
        <div class="recent_heading">
          <h4 innerHTML={header}></h4>
        </div>
        <div class="srch_bar">
          <div class="stylish-input-group">
            <input type="text" class="search-bar"  placeholder="Search" onChange={(event: UIEvent) => this.searchChanged(event)}></input>
            <span class="input-group-addon">
            <button type="button"> <i class="fa fa-search" aria-hidden="true"></i> </button>
            </span>
          </div>
        </div>
      </div>
    )

    //https://ptetutorials.com/images/user-profile.png
    output.push(
      <div class="inbox_people">
        {this.annotations.map((annotation) =>
          <div class="chat_list" id={"annotation-" + annotation.attributes.OBJECTID}>
              <div class="chat_people">
                <div class="chat_img"> <img src={this.authorImage(annotation.attributes.author)} alt="profile"/> </div>
                <div class="chat_ib">
                  <p>{annotation.attributes.description}</p>
                  <h5>{this.authorName(annotation.attributes.author)}
                    <span class="chat_date" onClick={() => this.deleteAnnotation(annotation.attributes.OBJECTID)}>{formatDate(annotation.attributes.created_at)}</span>
                  </h5>
                </div>
              </div>
            </div>
        )}
      </div>
    )
    output.push(
      <form id="annotation-form" onSubmit={(e) => this.addAnnotation(e)}>
        <div class="type_msg">
          <div class="input_msg_write">
            <textarea class="write_msg" placeholder="How can we improve our city?" ref={(el: HTMLInputElement) => this.textInput = el} />
            <button class="msg_send_btn" type="submit"><i class="fa fa-paper-plane-o" aria-hidden="true"></i></button>
          </div>
        </div>
      </form>
        // onClick2={(event: UIEvent) => this.addAnnotation(event)}
    )
    return output;
  }
}
