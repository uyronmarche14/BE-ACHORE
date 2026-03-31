export type ResourceAccessMetadata =
  | {
      resource: 'project';
      param: string;
      ownerOnly: boolean;
    }
  | {
      resource: 'task';
      param: string;
      ownerOnly: false;
    };
