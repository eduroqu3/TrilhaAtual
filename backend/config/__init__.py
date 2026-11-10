# Python 3.14 compatibility hotfix for Django 5.1 ForeignKey.get_default
import django.db.models.fields.related as _related_fields

_orig_foreignkey_get_default = _related_fields.ForeignKey.get_default


def _safe_foreignkey_get_default(self):
    field_default = super(_related_fields.ForeignKey, self).get_default()
    model = self.remote_field.model
    if isinstance(model, type) and isinstance(field_default, model):
        return getattr(field_default, self.target_field.attname)
    return field_default


_related_fields.ForeignKey.get_default = _safe_foreignkey_get_default
