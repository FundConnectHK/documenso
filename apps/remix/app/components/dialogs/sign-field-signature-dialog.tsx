import { useState } from 'react';

import { Trans } from '@lingui/react/macro';
import { Loader2 } from 'lucide-react';
import { createCallable } from 'react-call';

import { Button } from '@documenso/ui/primitives/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@documenso/ui/primitives/dialog';
import { SignaturePad } from '@documenso/ui/primitives/signature-pad';

import { DocumentSigningDisclosure } from '../general/document-signing/document-signing-disclosure';

export type SignFieldSignatureDialogProps = {
  initialSignature?: string;
  fullName?: string;
  typedSignatureEnabled?: boolean;
  uploadSignatureEnabled?: boolean;
  drawSignatureEnabled?: boolean;
};

export const SignFieldSignatureDialog = createCallable<
  SignFieldSignatureDialogProps,
  string | null
>(
  ({
    call,
    fullName,
    typedSignatureEnabled,
    uploadSignatureEnabled,
    drawSignatureEnabled,
    initialSignature,
  }) => {
    const [localSignature, setLocalSignature] = useState(initialSignature);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCancel = () => {
      setIsSubmitting(true);
      call.end(null);
    };

    const handleSign = () => {
      setIsSubmitting(true);
      call.end(localSignature || null);
    };

    return (
      <Dialog
        open={true}
        onOpenChange={(value) => {
          if (!value) {
            handleCancel();
          }
        }}
      >
        <DialogContent position="center">
          <div className="relative">
            {isSubmitting && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}
            <DialogHeader>
              <DialogTitle>
                <Trans>Sign Signature Field</Trans>
              </DialogTitle>
            </DialogHeader>

            <SignaturePad
              fullName={fullName}
              value={localSignature ?? ''}
              onChange={({ value }) => setLocalSignature(value)}
              typedSignatureEnabled={typedSignatureEnabled}
              uploadSignatureEnabled={uploadSignatureEnabled}
              drawSignatureEnabled={drawSignatureEnabled}
              disabled={isSubmitting}
            />
          </div>

          <DocumentSigningDisclosure />

          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              <Trans>Cancel</Trans>
            </Button>

            <Button
              type="button"
              disabled={!localSignature || isSubmitting}
              onClick={handleSign}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              <Trans>Sign</Trans>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  },
);
